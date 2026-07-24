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
exports.PushControllers = { notify, health };
