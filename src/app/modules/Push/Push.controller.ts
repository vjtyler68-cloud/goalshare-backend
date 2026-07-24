import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { sendPushToUser } from '../../utils/fcm';

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

export const PushControllers = { notify };
