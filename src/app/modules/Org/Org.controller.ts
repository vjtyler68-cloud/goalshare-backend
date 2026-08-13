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

const getMyOrgs = catchAsync(async (req: Request, res: Response) => {
  const result = await OrgServices.getMyOrgs(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My organizations',
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
  const result = await OrgServices.leaveOrg(req.user.id, req.body ?? {});
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Left organization',
    data: result,
  });
});

const setMap = catchAsync(async (req: Request, res: Response) => {
  const result = await OrgServices.setMap(
    req.user.id,
    req.params.id,
    req.body ?? {},
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Map saved',
    data: result,
  });
});

const setBooking = catchAsync(async (req: Request, res: Response) => {
  const result = await OrgServices.setBooking(
    req.user.id,
    req.params.id,
    req.body ?? {},
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Scheduler saved',
    data: result,
  });
});

const getSpace = catchAsync(async (req: Request, res: Response) => {
  const result = await OrgServices.getSpace(req.user.id, req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Team HQ',
    data: result,
  });
});

const createPost = catchAsync(async (req: Request, res: Response) => {
  const result = await OrgServices.createPost(
    req.user.id,
    req.params.id,
    req.body ?? {},
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Posted',
    data: result,
  });
});

const toggleLike = catchAsync(async (req: Request, res: Response) => {
  const result = await OrgServices.toggleLike(req.user.id, req.params.postId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Updated',
    data: result,
  });
});

const deletePost = catchAsync(async (req: Request, res: Response) => {
  const result = await OrgServices.deletePost(req.user.id, req.params.postId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Deleted',
    data: result,
  });
});

const createGoal = catchAsync(async (req: Request, res: Response) => {
  const result = await OrgServices.createGoal(
    req.user.id,
    req.params.id,
    req.body ?? {},
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Goal created',
    data: result,
  });
});

const bumpGoal = catchAsync(async (req: Request, res: Response) => {
  const result = await OrgServices.bumpGoal(
    req.user.id,
    req.params.goalId,
    req.body ?? {},
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Goal updated',
    data: result,
  });
});

const deleteGoal = catchAsync(async (req: Request, res: Response) => {
  const result = await OrgServices.deleteGoal(req.user.id, req.params.goalId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Goal deleted',
    data: result,
  });
});

const setMemberRole = catchAsync(async (req: Request, res: Response) => {
  const result = await OrgServices.setMemberRole(
    req.user.id,
    req.params.id,
    req.body ?? {},
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Role updated',
    data: result,
  });
});

// ── Task Hub ──────────────────────────────────────────────────────────────
const listTasks = catchAsync(async (req: Request, res: Response) => {
  const result = await OrgServices.listTasks(req.user.id, req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Tasks',
    data: result,
  });
});

const createTask = catchAsync(async (req: Request, res: Response) => {
  const result = await OrgServices.createTask(
    req.user.id,
    req.params.id,
    req.body ?? {},
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Task created',
    data: result,
  });
});

const updateTask = catchAsync(async (req: Request, res: Response) => {
  const result = await OrgServices.updateTask(
    req.user.id,
    req.params.taskId,
    req.body ?? {},
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Task updated',
    data: result,
  });
});

const deleteTask = catchAsync(async (req: Request, res: Response) => {
  const result = await OrgServices.deleteTask(req.user.id, req.params.taskId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Task deleted',
    data: result,
  });
});

const createProject = catchAsync(async (req: Request, res: Response) => {
  const result = await OrgServices.createProject(
    req.user.id,
    req.params.id,
    req.body ?? {},
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Project created',
    data: result,
  });
});

const deleteProject = catchAsync(async (req: Request, res: Response) => {
  const result = await OrgServices.deleteProject(
    req.user.id,
    req.params.projectId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Project deleted',
    data: result,
  });
});

export const OrgControllers = {
  createOrg,
  joinOrg,
  getMine,
  getMyOrgs,
  getRoster,
  pushSummary,
  leaveOrg,
  setMap,
  setBooking,
  getSpace,
  createPost,
  toggleLike,
  deletePost,
  createGoal,
  bumpGoal,
  deleteGoal,
  setMemberRole,
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  createProject,
  deleteProject,
};
