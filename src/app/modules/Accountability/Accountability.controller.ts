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
  const result = await AccountabilityServices.logCheckIn(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Checked in',
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
  upsertProfile,
  getMyProfile,
  setOptIn,
  getCurrentMatch,
  logCheckIn,
  requestExtend,
  submitRating,
  runWeeklyPairing,
};
