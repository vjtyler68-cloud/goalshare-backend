import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import AppError from '../../errors/AppError';
import { AccountabilityServices } from './Accountability.service';

const upsertProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await AccountabilityServices.upsertProfile(
    req.user.id,
    req.body ?? {},
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Buddy profile saved',
    data: result,
  });
});

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await AccountabilityServices.getMyProfile(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Buddy profile',
    data: result,
  });
});

const setOptIn = catchAsync(async (req: Request, res: Response) => {
  const result = await AccountabilityServices.setOptIn(
    req.user.id,
    req.body?.optedIn === true,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Opt-in updated',
    data: result,
  });
});

const createFriendMatch = catchAsync(async (req: Request, res: Response) => {
  const result = await AccountabilityServices.createFriendMatch(
    req.user.id,
    req.body ?? {},
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Buddy matched',
    data: result,
  });
});

const getCurrentMatch = catchAsync(async (req: Request, res: Response) => {
  const result = await AccountabilityServices.getCurrentMatch(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Current match',
    data: result,
  });
});

const logCheckIn = catchAsync(async (req: Request, res: Response) => {
  const result = await AccountabilityServices.logCheckIn(
    req.user.id,
    req.body ?? {},
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Checked in',
    data: result,
  });
});

const verifyProof = catchAsync(async (req: Request, res: Response) => {
  const result = await AccountabilityServices.verifyProof(
    req.user.id,
    req.body ?? {},
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Proof reviewed',
    data: result,
  });
});

const getCheckins = catchAsync(async (req: Request, res: Response) => {
  const result = await AccountabilityServices.getCheckins(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Check-ins',
    data: result,
  });
});

const sendVoice = catchAsync(async (req: Request, res: Response) => {
  const result = await AccountabilityServices.sendVoice(
    req.user.id,
    req.body ?? {},
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Voice sent',
    data: result,
  });
});

const getVoiceMessages = catchAsync(async (req: Request, res: Response) => {
  const result = await AccountabilityServices.getVoiceMessages(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Voice messages',
    data: result,
  });
});

const postStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await AccountabilityServices.postStatus(
    req.user.id,
    req.body ?? {},
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Status shared',
    data: result,
  });
});

const getStatuses = catchAsync(async (req: Request, res: Response) => {
  const result = await AccountabilityServices.getStatuses(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Status updates',
    data: result,
  });
});

const setGoals = catchAsync(async (req: Request, res: Response) => {
  const result = await AccountabilityServices.setGoals(
    req.user.id,
    req.body ?? {},
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Goals shared',
    data: result,
  });
});

const getBuddyGoals = catchAsync(async (req: Request, res: Response) => {
  const result = await AccountabilityServices.getBuddyGoals(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Buddy goals',
    data: result,
  });
});

const requestExtend = catchAsync(async (req: Request, res: Response) => {
  const result = await AccountabilityServices.requestExtend(
    req.user.id,
    req.body?.value === true,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Extend preference updated',
    data: result,
  });
});

const submitRating = catchAsync(async (req: Request, res: Response) => {
  const result = await AccountabilityServices.submitRating(
    req.user.id,
    Number(req.body?.stars),
    (req.body?.comment ?? '').toString(),
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Rating submitted',
    data: result,
  });
});

/** Scheduler-only. Guarded by a shared secret so it isn't user-callable. */
const runWeeklyPairing = catchAsync(async (req: Request, res: Response) => {
  const secret = process.env.CRON_SECRET;
  const provided = (req.headers['x-cron-secret'] ?? '').toString();
  if (!secret || provided !== secret) {
    throw new AppError(httpStatus.FORBIDDEN, 'Forbidden');
  }
  const result = await AccountabilityServices.runWeeklyPairing();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Weekly pairing complete',
    data: result,
  });
});

export const AccountabilityControllers = {
  createFriendMatch,
  upsertProfile,
  getMyProfile,
  setOptIn,
  getCurrentMatch,
  logCheckIn,
  verifyProof,
  getCheckins,
  sendVoice,
  getVoiceMessages,
  postStatus,
  getStatuses,
  setGoals,
  getBuddyGoals,
  requestExtend,
  submitRating,
  runWeeklyPairing,
};
