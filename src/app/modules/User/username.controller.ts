import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';

const prisma = new PrismaClient();

/** lowercase, 3-20 chars, letters/digits/underscore/dot */
const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

const normalize = (v: unknown): string =>
  typeof v === 'string' ? v.trim().toLowerCase() : '';

/**
 * PUT /user/username — claim or change the caller's public handle.
 * Uniqueness is checked case-insensitively (handles are stored lowercase).
 */
const setUsername = catchAsync(async (req: Request, res: Response) => {
  const username = normalize(req.body?.username);
  if (!USERNAME_RE.test(username)) {
    sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message:
        'Username must be 3-20 characters: lowercase letters, numbers, _ or .',
      data: null,
    });
    return;
  }

  const taken = await prisma.user.findFirst({
    where: { username, id: { not: req.user.id } },
    select: { id: true },
  });
  if (taken) {
    sendResponse(res, {
      statusCode: httpStatus.CONFLICT,
      success: false,
      message: 'That username is taken — try another.',
      data: null,
    });
    return;
  }

  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data: { username },
    select: { id: true, fullName: true, username: true, profile: true },
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Username saved',
    data: updated,
  });
});

/**
 * GET /user/search-users?q= — find people by username or name so reps can
 * follow teammates. Excludes deleted users; caps at 20 results.
 */
const searchUsers = catchAsync(async (req: Request, res: Response) => {
  const q = (req.query.q ?? '').toString().trim();
  if (q.length < 2) {
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Type at least 2 characters to search',
      data: [],
    });
    return;
  }

  const users = await prisma.user.findMany({
    where: {
      isDeleted: false,
      OR: [
        { username: { contains: q.toLowerCase() } },
        { fullName: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { id: true, fullName: true, username: true, profile: true },
    take: 20,
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Search results',
    data: users,
  });
});

export const UsernameControllers = { setUsername, searchUsers };
