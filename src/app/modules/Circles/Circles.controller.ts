import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { CirclesServices } from './Circles.service';

const createCircle = catchAsync(async (req: Request, res: Response) => {
  const result = await CirclesServices.createCircle(req.user.id, req.body ?? {});
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Circle created',
    data: result,
  });
});

const getMyCircle = catchAsync(async (req: Request, res: Response) => {
  const result = await CirclesServices.getMyCircle(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My circle',
    data: result,
  });
});

const checkinCircle = catchAsync(async (req: Request, res: Response) => {
  const result = await CirclesServices.checkinCircle(req.user.id, req.body ?? {});
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Checked in',
    data: result,
  });
});

const burnShield = catchAsync(async (req: Request, res: Response) => {
  const result = await CirclesServices.burnShield(req.user.id, req.body ?? {});
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Shield burned',
    data: result,
  });
});

const leaveCircle = catchAsync(async (req: Request, res: Response) => {
  const result = await CirclesServices.leaveCircle(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Left circle',
    data: result,
  });
});

export const CirclesControllers = {
  createCircle,
  getMyCircle,
  checkinCircle,
  burnShield,
  leaveCircle,
};
