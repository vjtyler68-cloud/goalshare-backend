import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { CanvassServices } from './Canvass.service';

const createPin = catchAsync(async (req: Request, res: Response) => {
  const result = await CanvassServices.createPin(
    req.user.id,
    req.params.orgId,
    req.body ?? {},
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Pin dropped',
    data: result,
  });
});

const listPins = catchAsync(async (req: Request, res: Response) => {
  const result = await CanvassServices.listPins(req.user.id, req.params.orgId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Pins',
    data: { pins: result },
  });
});

const updatePin = catchAsync(async (req: Request, res: Response) => {
  const result = await CanvassServices.updatePin(
    req.user.id,
    req.params.pinId,
    req.body ?? {},
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Pin updated',
    data: result,
  });
});

const assignPin = catchAsync(async (req: Request, res: Response) => {
  const result = await CanvassServices.assignPin(
    req.user.id,
    req.params.pinId,
    req.body ?? {},
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Lead assigned',
    data: result,
  });
});

const deletePin = catchAsync(async (req: Request, res: Response) => {
  const result = await CanvassServices.deletePin(req.user.id, req.params.pinId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Pin deleted',
    data: result,
  });
});

export const CanvassControllers = {
  createPin,
  listPins,
  updatePin,
  assignPin,
  deletePin,
};
