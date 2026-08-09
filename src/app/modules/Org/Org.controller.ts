import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { OrgServices } from './Org.service';

const createOrg = catchAsync(async (req: Request, res: Response) => {
  const result = await OrgServices.createOrg(req.user.id, req.body ?? {});
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Organization created',
    data: result,
  });
});

const joinOrg = catchAsync(async (req: Request, res: Response) => {
  const result = await OrgServices.joinOrg(req.user.id, req.body ?? {});
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Joined organization',
    data: result,
  });
});

const getMine = catchAsync(async (req: Request, res: Response) => {
  const result = await OrgServices.getMine(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My organization',
    data: result,
  });
});

const getRoster = catchAsync(async (req: Request, res: Response) => {
  const result = await OrgServices.getRoster(req.user.id, req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Org roster',
    data: result,
  });
});

const pushSummary = catchAsync(async (req: Request, res: Response) => {
  const result = await OrgServices.pushSummary(req.user.id, req.body ?? {});
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Summary saved',
    data: result,
  });
});

const leaveOrg = catchAsync(async (req: Request, res: Response) => {
  const result = await OrgServices.leaveOrg(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Left organization',
    data: result,
  });
});

export const OrgControllers = {
  createOrg,
  joinOrg,
  getMine,
  getRoster,
  pushSummary,
  leaveOrg,
};
