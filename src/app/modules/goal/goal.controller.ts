import catchAsync from '../../utils/catchAsync';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { Request, Response } from 'express';
import { GoalServices } from './goal.service';

// Goal
const createGoal = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await GoalServices.createGoal(req, userId);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Goal created successfully',
    data: result,
  });
});

const getMyGoals = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await GoalServices.getMyGoals(userId, req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My goals retrieved successfully',
    data: result,
  });
});

const getGoalById = catchAsync(async (req: Request, res: Response) => {
  const result = await GoalServices.getGoalById(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Goal details retrieved successfully',
    data: result,
  });
});

const updateGoal = catchAsync(async (req: Request, res: Response) => {
  const result = await GoalServices.updateGoal(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Goal updated successfully',
    data: result,
  });
});

const deleteGoal = catchAsync(async (req: Request, res: Response) => {
  const result = await GoalServices.deleteGoal(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Goal deleted successfully',
    data: result,
  });
});

const updateGoalStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await GoalServices.updateGoalStatus(
    req.params.id,
    req.body.status,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Goal status updated successfully',
    data: result,
  });
});

const goalBreakTimeSpent = catchAsync(async (req: Request, res: Response) => {
  const result = await GoalServices.goalBreakTimeSpent(
    req.params.goalId,
    req.body.breakTimeSpent,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Goal break time spent updated successfully',
    data: result,
  });
});

// Client
const addClient = catchAsync(async (req: Request, res: Response) => {
  const result = await GoalServices.addClient(req.params.goalId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Client added successfully',
    data: result,
  });
});

const getClientById = catchAsync(async (req: Request, res: Response) => {
  const result = await GoalServices.getClientById(req.params.clientId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Client details retrieved successfully',
    data: result,
  });
});

const updateClient = catchAsync(async (req: Request, res: Response) => {
  const result = await GoalServices.updateClient(req.params.clientId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'client updated successfully',
    data: result,
  });
});
const updateClientTimeSpent = catchAsync(
  async (req: Request, res: Response) => {
    const result = await GoalServices.updateClientTimeSpent(
      req.params.clientId,
      req.body.timeSpent,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'client updated successfully',
      data: result,
    });
  },
);

const updateClientStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await GoalServices.updateClientTimeSpent(
    req.params.clientId,
    req.body.status,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Client time spent updated successfully',
    data: result,
  });
});

// MyWhy
const addMyWhy = catchAsync(async (req: Request, res: Response) => {
  const result = await GoalServices.addMyWhy(req.params.goalId, req.body.text);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'MyWhy added successfully',
    data: result,
  });
});

// Affirmation
const addAffirmation = catchAsync(async (req: Request, res: Response) => {
  const result = await GoalServices.addAffirmation(
    req.params.goalId,
    req.body.text,
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Affirmation added successfully',
    data: result,
  });
});

export const GoalController = {
  createGoal,
  getMyGoals,
  getGoalById,
  updateGoal,
  deleteGoal,
  updateGoalStatus,
  goalBreakTimeSpent,

  addClient,
  getClientById,
  updateClient,
  updateClientTimeSpent,
  updateClientStatus,
  addMyWhy,
  addAffirmation,
};
