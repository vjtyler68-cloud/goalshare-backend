import catchAsync from '../../utils/catchAsync';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { Request, Response } from 'express';
import { CommunityServices } from './community.service';

const createIntoDb = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const file = req.file;

  const result = await CommunityServices.createIntoDb(userId, file, req);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Successfully created community',
    data: result,
  });
});

const getAllCommunity = catchAsync(async (req: Request, res: Response) => {
  const result = await CommunityServices.getAllCommunity(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved all community',
    ...result,
  });
});

const getCommunityById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CommunityServices.getCommunityByIdFromDB(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved community by id',
    data: result,
  });
});

const getMyCommunities = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await CommunityServices.getMyCommunities(userId, req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved communities created by the user',
    ...result,
  });
});

const updateIntoDb = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CommunityServices.updateIntoDb(id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully updated community',
    data: result,
  });
});

const deleteIntoDb = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CommunityServices.deleteIntoDb(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully deleted community',
    data: result,
  });
});

export const CommunityController = {
  createIntoDb,
  getAllCommunity,
  getCommunityById,
  updateIntoDb,
  deleteIntoDb,
  getMyCommunities,
};
