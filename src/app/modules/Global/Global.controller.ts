import catchAsync from '../../utils/catchAsync';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { Request, Response } from 'express';
import { GlobalServices } from './Global.service';

// MyWhy Controllers
const createMyWhy = catchAsync(async (req: Request, res: Response) => {
  const result = await GlobalServices.createMyWhy(req);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Successfully created MyWhy',
    data: result,
  });
});

const getMyMyWhy = catchAsync(async (req: Request, res: Response) => {
  const result = await GlobalServices.getAllMyWhy(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved all MyWhy',
    data: result,
  });
});

const getMyWhyById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await GlobalServices.getMyWhyById(req.user.id, id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved MyWhy by id',
    data: result,
  });
});

const deleteMyWhy = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await GlobalServices.deleteMyWhy(req.user.id, id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully deleted MyWhy',
    data: result,
  });
});

// Affirmation Controllers
const createAffirmation = catchAsync(async (req: Request, res: Response) => {
  const result = await GlobalServices.createAffirmation(req);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Successfully created Affirmation',
    data: result,
  });
});

const getMyAffirmation = catchAsync(async (req: Request, res: Response) => {
  const result = await GlobalServices.getAllAffirmation(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved all Affirmation',
    data: result,
  });
});

const getAffirmationById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await GlobalServices.getAffirmationById(req.user.id, id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved Affirmation by id',
    data: result,
  });
});

const deleteAffirmation = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await GlobalServices.deleteAffirmation(req.user.id, id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully deleted Affirmation',
    data: result,
  });
});

export const GlobalController = {
  // MyWhy
  createMyWhy,
  getMyMyWhy,
  getMyWhyById,
  deleteMyWhy,
  // Affirmation
  createAffirmation,
  getMyAffirmation,
  getAffirmationById,
  deleteAffirmation,
};
