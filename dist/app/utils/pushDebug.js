"use strict";
// TEMPORARY diagnostic store: records the most recent hit to the FCM-token
// registration endpoint per user, so we can see whether a device is even
// reaching it (and with what token / failure reason) without rebuilding the app.
//
// Persisted to Firestore (`push_debug/{userId}`) so a Railway restart / cold
// start can't wipe it — the in-memory Map was losing reports on the free tier,
// which is why /push/debug kept showing lastFcmHit:null even though build-120
// phones were sending failure reports. In-memory stays as a fast fallback.
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordFcmHit = recordFcmHit;
exports.getFcmHit = getFcmHit;
const hits = new Map();
// Return an initialized Firestore handle, or null if firebase-admin isn't ready.
// Force firebase-admin init via the existing fcm util (isPushReady lazily
// initializes the default app) so a write from setFcmToken works even if no push
// has been sent yet this process.
function fs() {
    try {
        try {
            require('./fcm').isPushReady();
        }
        catch (e) { /* ignore */ }
        const admin = require('firebase-admin');
        if (admin.apps && admin.apps.length) {
            return admin.firestore();
        }
    }
    catch (e) { /* ignore */ }
    return null;
}
function recordFcmHit(userId, info) {
    const rec = Object.assign({ at: new Date().toISOString() }, info || {});
    try {
        hits.set(userId, rec);
    }
    catch (e) { /* ignore */ }
    try {
        const db = fs();
        if (db) {
            db.collection('push_debug').doc(String(userId)).set(rec).catch(() => { });
        }
    }
    catch (e) { /* ignore */ }
}
async function getFcmHit(userId) {
    try {
        const db = fs();
        if (db) {
            const snap = await db.collection('push_debug').doc(String(userId)).get();
            if (snap && snap.exists) {
                return snap.data();
            }
        }
    }
    catch (e) { /* ignore */ }
    return hits.get(userId) || null;
}
