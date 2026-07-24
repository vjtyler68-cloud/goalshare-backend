/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-var-requires */
import { prisma } from './prisma';

/**
 * Push notifications via Firebase Cloud Messaging (firebase-admin).
 *
 * Design goals, in priority order:
 *  1. NEVER crash the server. firebase-admin is `require`d lazily (inside the
 *     init function, not at module load) so a missing package or a missing
 *     service-account env var can't take the process down at boot.
 *  2. NEVER throw to callers. Every send is wrapped — a push failure must not
 *     break the friend-request / accept / message flow that triggered it.
 *  3. Self-heal token rot: when FCM reports a token as permanently invalid,
 *     clear it on the user so we stop retrying.
 *
 * Setup (one-time, done by VJ):
 *  - Firebase Console -> goalshare-966d1 -> Project settings -> Service accounts
 *    -> Generate new private key. Put the JSON in the Railway env var
 *    FIREBASE_SERVICE_ACCOUNT (or base64 in FIREBASE_SERVICE_ACCOUNT_B64).
 *  - The APNs .p8 key is already uploaded to Firebase, so iOS delivery works
 *    with no extra config here.
 * FCM sending is free on the Firebase Spark plan — no Blaze required.
 */

let messaging: any = null;
let initTried = false;
let initFailed = false;

function getMessaging(): any {
  if (messaging) return messaging;
  if (initTried) return initFailed ? null : messaging;
  initTried = true;
  try {
    // Lazy require so a missing package can NEVER crash server boot.
    const admin = require('firebase-admin');

    const raw =
      process.env.FIREBASE_SERVICE_ACCOUNT ||
      (process.env.FIREBASE_SERVICE_ACCOUNT_B64
        ? Buffer.from(
            process.env.FIREBASE_SERVICE_ACCOUNT_B64,
            'base64',
          ).toString('utf8')
        : '');
    if (!raw) {
      initFailed = true;
      console.warn('[push] FIREBASE_SERVICE_ACCOUNT not set — push disabled');
      return null;
    }
    const serviceAccount = JSON.parse(raw);
    if (!admin.apps || admin.apps.length === 0) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    messaging = admin.messaging();
    return messaging;
  } catch (err: any) {
    initFailed = true;
    console.warn('[push] init failed — push disabled:', err?.message || err);
    return null;
  }
}

/**
 * Diagnostic: true once firebase-admin has initialized with a valid service
 * account (i.e. the FIREBASE_SERVICE_ACCOUNT env var is present and parseable).
 * Used by GET /push/health to confirm the key without sending anything.
 */
export function isPushReady(): boolean {
  return getMessaging() != null;
}

/**
 * Send a push to a single user by their stored fcmToken. Never throws. If FCM
 * says the token is dead, clear it so we stop trying.
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data: Record<string, string> = {},
): Promise<void> {
  try {
    if (!userId) return;
    const m = getMessaging();
    if (!m) return; // push not configured — no-op

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });
    const token = user?.fcmToken;
    if (!token) return;

    await m.send({
      token,
      notification: { title, body },
      data: data || {},
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
      android: {
        priority: 'high',
        notification: { channelId: 'messages', sound: 'default' },
      },
    });
  } catch (err: any) {
    const code = err?.errorInfo?.code || err?.code || '';
    if (
      code === 'messaging/registration-token-not-registered' ||
      code === 'messaging/invalid-registration-token' ||
      code === 'messaging/invalid-argument'
    ) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { fcmToken: null },
        });
      } catch {
        /* ignore */
      }
    } else {
      console.warn('[push] send failed:', err?.message || err);
    }
  }
}

/** Notify [toId] that [fromId] sent them a friend request. Fire-and-forget. */
export async function pushFriendRequest(
  fromId: string,
  toId: string,
): Promise<void> {
  try {
    const from = await prisma.user.findUnique({
      where: { id: fromId },
      select: { fullName: true },
    });
    const name = from?.fullName || 'Someone';
    await sendPushToUser(toId, 'New friend request', `${name} wants to be friends`, {
      type: 'friend_request',
      fromUserId: fromId,
    });
  } catch {
    /* ignore */
  }
}

/**
 * Notify [toId] that [fromId] accepted their friend request (also used for the
 * mutual-ask auto-accept). Fire-and-forget.
 */
export async function pushFriendAccepted(
  fromId: string,
  toId: string,
): Promise<void> {
  try {
    const from = await prisma.user.findUnique({
      where: { id: fromId },
      select: { fullName: true },
    });
    const name = from?.fullName || 'Someone';
    await sendPushToUser(
      toId,
      'Friend request accepted',
      `${name} accepted your friend request`,
      { type: 'friend_accept', fromUserId: fromId },
    );
  } catch {
    /* ignore */
  }
}
