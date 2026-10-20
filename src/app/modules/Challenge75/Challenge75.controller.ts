import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { Challenge75Services } from './Challenge75.service';

const createCrew = catchAsync(async (req: Request, res: Response) => {
  const result = await Challenge75Services.createCrew(req.user.id, req.body ?? {});
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Crew created',
    data: result,
  });
});

const joinCrew = catchAsync(async (req: Request, res: Response) => {
  const result = await Challenge75Services.joinCrew(req.user.id, req.body ?? {});
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Joined crew',
    data: result,
  });
});

const leaveCrew = catchAsync(async (req: Request, res: Response) => {
  const result = await Challenge75Services.leaveCrew(req.user.id, req.body ?? {});
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Left crew',
    data: result,
  });
});

const pushProgress = catchAsync(async (req: Request, res: Response) => {
  const result = await Challenge75Services.pushProgress(
    req.user.id,
    req.body ?? {},
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Progress synced',
    data: result,
  });
});

const listMembers = catchAsync(async (req: Request, res: Response) => {
  const result = await Challenge75Services.listMembers(
    req.user.id,
    req.params.code,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Crew members',
    data: result,
  });
});

export const Challenge75Controllers = {
  createCrew,
  joinCrew,
  leaveCrew,
  pushProgress,
  listMembers,
};
