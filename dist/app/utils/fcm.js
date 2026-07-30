"use strict";
/* Compiled counterpart of src/app/utils/fcm.ts — FCM HTTP v1 direct send.
 * Must be committed alongside src/app/utils/fcm.ts because Railway runs the
 * committed dist/ (no build step). Keep both in sync. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPushReady = isPushReady;
exports.sendPushToUser = sendPushToUser;
const prisma_1 = require("./prisma");
const crypto = require("crypto");
const https = require("https");

// Plain node:https POST — bypasses fetch/undici, which was observed dropping
// the Authorization header on this host. Returns { status, json }.
function httpsPostJson(urlStr, headers, bodyObj) {
    return new Promise((resolve, reject) => {
        const u = new URL(urlStr);
        const body = Buffer.from(JSON.stringify(bodyObj));
        const req = https.request({
            hostname: u.hostname,
            path: u.pathname + u.search,
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json', 'Content-Length': body.length },
        }, (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => {
                let json = null;
                try { json = JSON.parse(data); } catch (_) { }
                resolve({ status: res.statusCode || 0, json });
            });
        });
        req.on('error', reject);
        req.setTimeout(15000, () => req.destroy(new Error('timeout')));
        req.write(body);
        req.end();
    });
}

let sa = null;
let saTried = false;
function getServiceAccount() {
    if (sa) return sa;
    if (saTried) return sa;
    saTried = true;
    try {
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT ||
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
    }
    catch (err) {
        console.warn('[push] service account parse failed — push disabled:', (err && err.message) || err);
        return null;
    }
}
function isPushReady() {
    return getServiceAccount() != null;
}
let cachedToken = null;
let cachedTokenExp = 0;
async function getAccessToken() {
    const acct = getServiceAccount();
    if (!acct) return null;
    const now = Math.floor(Date.now() / 1000);
    if (cachedToken && now < cachedTokenExp - 60) return cachedToken;
    try {
        const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
        const unsigned = b64u({ alg: 'RS256', typ: 'JWT' }) + '.' + b64u({
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
            body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') +
                '&assertion=' + encodeURIComponent(unsigned + '.' + sig),
        });
        const j = await res.json().catch(() => null);
        if (!res.ok || !j || !j.access_token) {
            console.warn('[push] oauth token fetch failed:', res.status, JSON.stringify(j) ? JSON.stringify(j).slice(0, 300) : '');
            return null;
        }
        cachedToken = j.access_token;
        cachedTokenExp = now + (Number(j.expires_in) || 3600);
        return cachedToken;
    }
    catch (err) {
        console.warn('[push] oauth token fetch error:', (err && err.message) || err);
        return null;
    }
}
async function sendPushToUser(userId, title, body, data = {}) {
    try {
        if (!userId) return;
        const acct = getServiceAccount();
        if (!acct) return;
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { fcmToken: true },
        });
        const token = user && user.fcmToken;
        if (!token) return;
        const accessToken = await getAccessToken();
        if (!accessToken) return;
        const msg = {
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
        };
        // Auth via query param, falling back to the Authorization header on 401:
        // header-based auth from this host was rejected by Google's edge as
        // "missing credential" even with a valid token, so query-param goes first.
        let res = await httpsPostJson(
            `https://fcm.googleapis.com/v1/projects/${acct.project_id}/messages:send?access_token=${encodeURIComponent(accessToken)}`,
            {}, msg);
        if (res.status === 401) {
            res = await httpsPostJson(
                `https://fcm.googleapis.com/v1/projects/${acct.project_id}/messages:send`,
                { Authorization: `Bearer ${accessToken}` }, msg);
        }
        if (res.status < 200 || res.status >= 300) {
            const j = res.json;
            const det = j && j.error && j.error.details;
            const errCode = (det && det.find((d) => d && d.errorCode) && det.find((d) => d && d.errorCode).errorCode) ||
                (j && j.error && j.error.status) || '';
            if (errCode === 'UNREGISTERED' || errCode === 'INVALID_ARGUMENT' || res.status === 404) {
                try {
                    await prisma_1.prisma.user.update({ where: { id: userId }, data: { fcmToken: null } });
                }
                catch (_a) { /* ignore */ }
            }
            else {
                console.warn('[push] send failed:', res.status, JSON.stringify(j));
            }
        }
    }
    catch (err) {
        console.warn('[push] send failed:', (err && err.message) || err);
    }
}
