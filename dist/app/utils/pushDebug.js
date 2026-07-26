"use strict";
// TEMPORARY diagnostic store: records the most recent hit to the FCM-token
// registration endpoint per user, so we can see whether a device is even
// reaching it (and with what token) without rebuilding the app. In-memory only.
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordFcmHit = recordFcmHit;
exports.getFcmHit = getFcmHit;
const hits = new Map();
function recordFcmHit(userId, info) {
    try {
        hits.set(userId, Object.assign({ at: new Date().toISOString() }, info || {}));
    }
    catch (e) { /* ignore */ }
}
function getFcmHit(userId) {
    return hits.get(userId) || null;
}
