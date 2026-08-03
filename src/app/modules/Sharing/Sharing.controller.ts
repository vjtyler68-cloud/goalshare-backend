import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { SharingServices } from './Sharing.service';

const upsertSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await SharingServices.upsertSettings(
    req.user.id,
    req.body ?? {},
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Sharing settings saved',
    data: result,
  });
});

const getSummary = catchAsync(async (req: Request, res: Response) => {
  const result = await SharingServices.getSummaryFor(
    req.user.id,
    req.params.userId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Shared summary',
    data: result,
  });
});

export const SharingControllers = { upsertSettings, getSummary };
