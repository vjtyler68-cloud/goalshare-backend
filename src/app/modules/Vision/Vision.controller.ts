import catchAsync from '../../utils/catchAsync';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { Request, Response } from 'express';
import { visionServices } from './Vision.service';

const createIntoDb = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const file = req.file;
  const year = JSON.parse(req.body.data);
  const result = await visionServices.createIntoDb(userId, file, year.year);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Successfully created Vision',
    data: result,
  });
});

const getAllVision = catchAsync(async (req: Request, res: Response) => {
  const result = await visionServices.getAllVision(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved all Vision',
    ...result,
  });
});

const getVisionById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await visionServices.getVisionByIdFromDB(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved Vision by id',
    data: result,
  });
});
const getMyVision = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await visionServices.getMyVision(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved my Vision ',
    data: result,
  });
});

const deleteIntoDb = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await visionServices.deleteIntoDb(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully deleted Vision',
    data: result,
  });
});

export const VisionController = {
  createIntoDb,
  getAllVision,
  getVisionById,
  getMyVision,
  deleteIntoDb,
};
