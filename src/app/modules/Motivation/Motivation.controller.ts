import catchAsync from '../../utils/catchAsync';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { Request, Response } from 'express';
import { MotivationServices } from './Motivation.service';

const createIntoDb = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const file = req.file;
  const title = JSON.parse(req.body.data);
  const result = await MotivationServices.createIntoDb(
    userId,
    file,
    title.title,
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Successfully created Motivation',
    data: result,
  });
});

const getAllMotivation = catchAsync(async (req: Request, res: Response) => {
  const result = await MotivationServices.getAllMotivation(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved all Motivation',
    ...result,
  });
});

const getMotivationById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await MotivationServices.getMotivationByIdFromDB(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved Motivation by id',
    data: result,
  });
});
const getMyMotivation = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await MotivationServices.getMyMotivation(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved Motivation by id',
    data: result,
  });
});

const updateIntoDb = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const file = req.file;
  const bodyData = req.body?.data ? JSON.parse(req.body.data) : req.body;

  const result = await MotivationServices.updateIntoDb(id, bodyData, file);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully updated Motivation',
    data: result,
  });
});

const deleteIntoDb = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await MotivationServices.deleteIntoDb(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully deleted Motivation',
    data: result,
  });
});

export const MotivationController = {
  createIntoDb,
  getAllMotivation,
  getMotivationById,
  getMyMotivation,
  updateIntoDb,
  deleteIntoDb,
};
