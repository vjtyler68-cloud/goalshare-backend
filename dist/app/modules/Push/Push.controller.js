"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushControllers = void 0;
const catchAsync_1 = __importDefault(require("../../utils/catchAsync"));
const sendResponse_1 = __importDefault(require("../../utils/sendResponse"));
const http_status_1 = __importDefault(require("http-status"));
const fcm_1 = require("../../utils/fcm");
const prisma_1 = require("../../utils/prisma");
// POST /push/notify { toUserId, title, body } — used when a chat message is sent
// (chat is in Firestore, so the server only knows via the sender's app). Push is
// fire-and-forget; we always answer 200 so a missed push never errors the sender.
const notify = (0, catchAsync_1.default)(async (req, res) => {
    const toUserId = ((req.body && req.body.toUserId) || '').toString();
    const title = ((req.body && req.body.title) || 'New message').toString();
    const body = ((req.body && req.body.body) || '').toString();
    if (toUserId) {
        (0, fcm_1.sendPushToUser)(toUserId, title, body, {
            type: 'chat',
            fromUserId: req.user.id,
        });
    }
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'ok',
        data: null,
    });
});
// GET /push/health — reports whether firebase-admin is configured (key valid).
const health = (0, catchAsync_1.default)(async (req, res) => {
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'push health',
        data: { ok: (0, fcm_1.isPushReady)() },
    });
});
// GET /push/debug?key=...&email=...&send=1 — TEMPORARY diagnostic. Reports
// whether a user has an FCM token registered, and (with send=1) fires a real
// push straight to it, returning the exact FCM error if delivery fails. Guarded
// by a key. Remove after debugging.
const debug = (0, catchAsync_1.default)(async (req, res) => {
    const key = ((req.query && req.query.key) || '').toString();
    if (key !== 'gsPushDebug_2026') {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.FORBIDDEN,
            success: false,
            message: 'forbidden',
            data: null,
        });
    }
    const email = ((req.query && req.query.email) || '').toString();
    const doSend = ((req.query && req.query.send) || '').toString() === '1';
    const user = await prisma_1.prisma.user.findFirst({
        where: { email },
        select: { id: true, email: true, fcmToken: true, platform: true },
    });
    if (!user) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.OK,
            success: true,
            message: 'debug',
            data: { found: false, email },
        });
    }
    const token = user.fcmToken || null;
    let sendResult = null;
    if (doSend && token && (0, fcm_1.isPushReady)()) {
        try {
            const admin = require('firebase-admin');
            const id = await admin.messaging().send({
                token,
                notification: { title: 'GoalShare test', body: 'Push is working ✅' },
                apns: { payload: { aps: { sound: 'default', badge: 1 } } },
            });
            sendResult = { ok: true, id };
        }
        catch (err) {
            sendResult = {
                ok: false,
                code: (err && err.errorInfo && err.errorInfo.code) ||
                    (err && err.code) ||
                    'unknown',
                message: (err && err.message) || String(err),
            };
        }
    }
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'debug',
        data: {
            found: true,
            userId: user.id,
            hasToken: !!token,
            platform: user.platform || null,
            tokenTail: token ? token.slice(-8) : null,
            pushReady: (0, fcm_1.isPushReady)(),
            sendResult,
        },
    });
});
exports.PushControllers = { notify, health, debug };
