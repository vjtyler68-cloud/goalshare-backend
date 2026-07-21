import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { FriendsServices } from './Friends.service';

const sendRequest = catchAsync(async (req: Request, res: Response) => {
  const result = await FriendsServices.sendRequest(
    req.user.id,
    (req.body?.toUserId ?? '').toString(),
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: result.becameFriends
      ? "You're now friends!"
      : 'Friend request sent',
    data: result,
  });
});

const listRequests = catchAsync(async (req: Request, res: Response) => {
  const result = await FriendsServices.listRequests(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Friend requests',
    data: result,
  });
});

const acceptRequest = catchAsync(async (req: Request, res: Response) => {
  const result = await FriendsServices.acceptRequest(
    req.user.id,
    req.params.id,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "You're now friends!",
    data: result,
  });
});

const declineRequest = catchAsync(async (req: Request, res: Response) => {
  const result = await FriendsServices.declineRequest(
    req.user.id,
    req.params.id,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Request declined',
    data: result,
  });
});

const cancelRequest = catchAsync(async (req: Request, res: Response) => {
  await FriendsServices.cancelRequest(req.user.id, req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Request cancelled',
    data: null,
  });
});

const listFriends = catchAsync(async (req: Request, res: Response) => {
  const result = await FriendsServices.listFriends(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Friends',
    data: result,
  });
});

const removeFriend = catchAsync(async (req: Request, res: Response) => {
  await FriendsServices.removeFriend(req.user.id, req.params.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Friend removed',
    data: null,
  });
});

export const FriendsControllers = {
  sendRequest,
  listRequests,
  acceptRequest,
  declineRequest,
  cancelRequest,
  listFriends,
  removeFriend,
};
