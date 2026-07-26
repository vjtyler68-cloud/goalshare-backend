/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-var-requires */
import { prisma } from './prisma';

/**
 * Push notifications via FCM HTTP v1 — DIRECT, no firebase-admin for sending.
 *
 * WHY: firebase-admin's send() was hitting FCM with NO Authorization header on
 * this deployment ("Request is missing required authentication credential"),
 * on both Node 18 and Node 22, even though the service-account key is valid
 * (verified independently: manual JWT -> oauth2.googleapis.com -> FCM v1 send
 * succeeds with the same key). So we do exactly that proven flow ourselves
 * with node:crypto + fetch. Zero new dependencies.
 *
 * firebase-admin can stay installed for Firestore use elsewhere; this module
 * no longer touches it.
 *
 * Same design rules as before:
 *  1. NEVER crash the server.
 *  2. NEVER throw to callers.
 *  3. Self-heal token rot (clear dead device tokens).
 */

const crypto = require('crypto');

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

let sa: ServiceAccount | null = null;
let saTried = false;

function getServiceAccount(): ServiceAccount | null {
  if (sa) return sa;
  if (saTried) return sa;
  saTried = true;
  try {
    const raw =
      process.env.FIREBASE_SERVICE_ACCOUNT ||
      (process.env.FIREBASE_SERVICE_ACCOUNT_B64
        ? Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8')
        : '');
    if (!raw) {
      console.warn('[push] FIREBASE_SERVICE_ACCOUNT not set — push disabled');
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      console.warn('[push] FIREBASE_SERVICE_ACCOUNT missing fields — push disabled');
      return null;
    }
    sa = parsed;
    return sa;
  } catch (err: any) {
    console.warn('[push] service account parse failed — push disabled:', err?.message || err);
    return null;
  }
}

export function isPushReady(): boolean {
  return getServiceAccount() != null;
}

// ---- OAuth token (cached ~50 min; Google issues 60-min tokens) ----
let cachedToken: string | null = null;
let cachedTokenExp = 0;

async function getAccessToken(): Promise<string | null> {
  const acct = getServiceAccount();
  if (!acct) return null;
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now < cachedTokenExp - 60) return cachedToken;
  try {
    const b64u = (o: any) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const unsigned =
      b64u({ alg: 'RS256', typ: 'JWT' }) +
      '.' +
      b64u({
        iss: acct.client_email,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      });
    const sig = crypto.sign('RSA-SHA256', Buffer.from(unsigned), acct.private_key).toString('base64url');
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:
        'grant_type=' +
        encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') +
        '&assertion=' +
        encodeURIComponent(unsigned + '.' + sig),
    });
    const j: any = await res.json().catch(() => null);
    if (!res.ok || !j?.access_token) {
      console.warn('[push] oauth token fetch failed:', res.status, JSON.stringify(j)?.slice(0, 300));
      return null;
    }
    cachedToken = j.access_token;
    cachedTokenExp = now + (Number(j.expires_in) || 3600);
    return cachedToken;
  } catch (err: any) {
    console.warn('[push] oauth token fetch error:', err?.message || err);
    return null;
  }
}

/**
 * Send a push to a single user by their stored fcmToken. Never throws.
 * If FCM says the token is dead, clear it so we stop trying.
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data: Record<string, string> = {},
): Promise<void> {
  try {
    if (!userId) return;
    const acct = getServiceAccount();
    if (!acct) return; // push not configured — no-op

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });
    const token = user?.fcmToken;
    if (!token) return;

    const accessToken = await getAccessToken();
    if (!accessToken) return;

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${acct.project_id}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title, body },
            data: data || {},
            apns: { payload: { aps: { sound: 'default', badge: 1 } } },
            android: {
              priority: 'HIGH',
              notification: { channel_id: 'messages', sound: 'default' },
            },
          },
        }),
      },
    );

    if (!res.ok) {
      const j: any = await res.json().catch(() => null);
      const errCode =
        j?.error?.details?.find((d: any) => d?.errorCode)?.errorCode || j?.error?.status || '';
      if (errCode === 'UNREGISTERED' || errCode === 'INVALID_ARGUMENT' || res.status === 404) {
        // Dead/invalid device token — clear it so we stop retrying.
        try {
          await prisma.user.update({ where: { id: userId }, data: { fcmToken: null } });
        } catch {
          /* ignore */
        }
      } else {
        console.warn('[push] send failed:', res.status, JSON.stringify(j)?.slice(0, 300));
      }
    }
  } catch (err: any) {
    console.warn('[push] send failed:', err?.message || err);
  }
}
