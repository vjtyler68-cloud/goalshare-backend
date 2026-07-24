import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { sendPushToUser, isPushReady } from '../../utils/fcm';

/**
 * POST /push/notify  { toUserId, title, body }
 *
 * Used by the app when a chat message is sent. Chat lives in Firestore, so the
 * server only learns about a new message when the sender's app tells it. The
 * push is fire-and-forget — we always answer 200 so a missed push never surfaces
 * as an error to the sender.
 */
const notify = catchAsync(async (req, res) => {
  const toUserId = (req.body?.toUserId ?? '').toString();
  const title = (req.body?.title ?? 'New message').toString();
  const body = (req.body?.body ?? '').toString();

  if (toUserId) {
    sendPushToUser(toUserId, title, body, {
      type: 'chat',
      fromUserId: req.user.id,
    });
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'ok',
    data: null,
  });
});

// GET /push/health — reports whether firebase-admin is configured (key valid).
// Sends nothing; safe to hit. Returns { ok: true } once the service account is
// loaded, { ok: false } if FIREBASE_SERVICE_ACCOUNT is missing/malformed.
const health = catchAsync(async (req, res) => {
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'push health',
    data: { ok: isPushReady() },
  });
});

export const PushControllers = { notify, health };
