"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPushReady = isPushReady;
exports.sendPushToUser = sendPushToUser;
exports.pushFriendRequest = pushFriendRequest;
exports.pushFriendAccepted = pushFriendAccepted;
const prisma_1 = require("./prisma");
// Diagnostic: true once firebase-admin initialized with a valid service account.
function isPushReady() {
    return getMessaging() != null;
}
// Push notifications via Firebase Cloud Messaging (firebase-admin).
// firebase-admin is require()d LAZILY (inside getMessaging, not at module load)
// so a missing package / missing env var can NEVER crash the server at boot.
// Every send is wrapped — a push failure must not break the flow that fired it.
let messaging = null;
let initTried = false;
let initFailed = false;
function getMessaging() {
    if (messaging)
        return messaging;
    if (initTried)
        return initFailed ? null : messaging;
    initTried = true;
    try {
        // Lazy require so a missing package can NEVER crash server boot.
        const admin = require('firebase-admin');
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT ||
            (process.env.FIREBASE_SERVICE_ACCOUNT_B64
                ? Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8')
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
    }
    catch (err) {
        initFailed = true;
        console.warn('[push] init failed — push disabled:', (err && err.message) || err);
        return null;
    }
}
async function sendPushToUser(userId, title, body, data = {}) {
    try {
        if (!userId)
            return;
        const m = getMessaging();
        if (!m)
            return; // push not configured — no-op
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { fcmToken: true },
        });
        const token = user && user.fcmToken;
        if (!token)
            return;
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
    }
    catch (err) {
        const code = (err && err.errorInfo && err.errorInfo.code) || (err && err.code) || '';
        if (code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/invalid-argument') {
            try {
                await prisma_1.prisma.user.update({
                    where: { id: userId },
                    data: { fcmToken: null },
                });
            }
            catch (e) {
                /* ignore */
            }
        }
        else {
            console.warn('[push] send failed:', (err && err.message) || err);
        }
    }
}
async function pushFriendRequest(fromId, toId) {
    try {
        const from = await prisma_1.prisma.user.findUnique({
            where: { id: fromId },
            select: { fullName: true },
        });
        const name = (from && from.fullName) || 'Someone';
        await sendPushToUser(toId, 'New friend request', name + ' wants to be friends', {
            type: 'friend_request',
            fromUserId: fromId,
        });
    }
    catch (e) {
        /* ignore */
    }
}
async function pushFriendAccepted(fromId, toId) {
    try {
        const from = await prisma_1.prisma.user.findUnique({
            where: { id: fromId },
            select: { fullName: true },
        });
        const name = (from && from.fullName) || 'Someone';
        await sendPushToUser(toId, 'Friend request accepted', name + ' accepted your friend request', { type: 'friend_accept', fromUserId: fromId });
    }
    catch (e) {
        /* ignore */
    }
}
