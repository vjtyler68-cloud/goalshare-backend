import { Request, Response, NextFunction } from 'express';

import { prisma } from '../utils/prisma';
import AppError from '../errors/AppError';

export const ensureApproved = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // assume req.user.id is set by earlier auth middleware after JWT verification
  const userId = (req as any).user?.id;
  if (!userId) return next(new AppError(401, 'Unauthorized'));

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isApproved: true, role: true },
  });
  if (!user) return next(new AppError(401, 'User not found'));

  // allow admin always
  if (user.role === 'ADMIN') return next();

  if (!user.isApproved) {
    return next(new AppError(403, 'Account not approved by admin yet'));
  }

  return next();
};
