import catchAsync from '../../utils/catchAsync';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { Request, Response } from 'express';
import { DataServices } from './Data.service';

const exportMyData = catchAsync(async (req: Request, res: Response) => {
  const result = await DataServices.exportMyData(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully exported your data',
    data: result,
  });
});

const reportCrash = catchAsync(async (req: Request, res: Response) => {
  // Best-effort user attribution: /data/crash is unauthenticated (crashes can
  // happen pre-login), but the app sends a userId hint when it has one.
  const result = await DataServices.reportCrash(
    req.body,
    typeof req.body?.userId === 'string' ? req.body.userId : '',
  );
  sendResponse(res, {
    statusCode: result ? httpStatus.CREATED : httpStatus.BAD_REQUEST,
    success: !!result,
    message: result ? 'Crash report received' : 'error field is required',
    data: result,
  });
});

export const DataController = {
  exportMyData,
  reportCrash,
};
