import { PrismaClient } from '@prisma/client';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';

const prisma = new PrismaClient();

/** Public shape of the person on the other end of a request/friendship. */
const userSelect = {
  id: true,
  fullName: true,
  username: true,
  profile: true,
} as const;

/** The single row (any direction, any status) between two users, or null. */
const edgeBetween = (a: string, b: string) =>
  prisma.friendRequest.findFirst({
    where: {
      OR: [
        { fromId: a, toId: b },
        { fromId: b, toId: a },
      ],
    },
  });

/**
 * Send a friend request. Idempotent-ish by design:
 *  - already friends            → 409
 *  - I already asked            → 409
 *  - THEY already asked me      → auto-accept (mutual intent = friends)
 *  - they declined me earlier   → flips the old row back to pending
 */
const sendRequest = async (myId: string, toUserId: string) => {
  if (!toUserId || toUserId === myId) {
    throw new AppError(httpStatus.BAD_REQUEST, "You can't friend yourself.");
  }
  const target = await prisma.user.findFirst({
    where: { id: toUserId, isDeleted: false },
    select: { id: true },
  });
  if (!target) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  const existing = await edgeBetween(myId, toUserId);
  if (!existing) {
    const created = await prisma.friendRequest.create({
      data: { fromId: myId, toId: toUserId },
    });
    return { request: created, becameFriends: false };
  }

  if (existing.status === 'accepted') {
    throw new AppError(httpStatus.CONFLICT, "You're already friends.");
  }
  if (existing.status === 'pending') {
    if (existing.fromId === myId) {
      throw new AppError(httpStatus.CONFLICT, 'Request already sent.');
    }
    // They asked me first and I'm now asking them — that's a yes.
    const accepted = await prisma.friendRequest.update({
      where: { id: existing.id },
      data: { status: 'accepted' },
    });
    return { request: accepted, becameFriends: true };
  }
  // declined earlier — allow a fresh ask, re-pointed at the new sender.
  const revived = await prisma.friendRequest.update({
    where: { id: existing.id },
    data: { fromId: myId, toId: toUserId, status: 'pending' },
  });
  return { request: revived, becameFriends: false };
};

/** Incoming + sent PENDING requests, each with the counterpart's info. */
const listRequests = async (myId: string) => {
  const [incoming, sent] = await Promise.all([
    prisma.friendRequest.findMany({
      where: { toId: myId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: { from: { select: userSelect } },
    }),
    prisma.friendRequest.findMany({
      where: { fromId: myId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: { to: { select: userSelect } },
    }),
  ]);
  return {
    incoming: incoming.map(r => ({
      id: r.id,
      user: r.from,
      sentAt: r.createdAt,
    })),
    sent: sent.map(r => ({ id: r.id, user: r.to, sentAt: r.createdAt })),
  };
};

/** Recipient accepts a pending request. */
const acceptRequest = async (myId: string, requestId: string) => {
  const req = await prisma.friendRequest.findFirst({
    where: { id: requestId, toId: myId, status: 'pending' },
  });
  if (!req) throw new AppError(httpStatus.NOT_FOUND, 'Request not found');
  const updated = await prisma.friendRequest.update({
    where: { id: req.id },
    data: { status: 'accepted' },
  });
  return updated;
};

/** Recipient declines a pending request. */
const declineRequest = async (myId: string, requestId: string) => {
  const req = await prisma.friendRequest.findFirst({
    where: { id: requestId, toId: myId, status: 'pending' },
  });
  if (!req) throw new AppError(httpStatus.NOT_FOUND, 'Request not found');
  return prisma.friendRequest.update({
    where: { id: req.id },
    data: { status: 'declined' },
  });
};

/** Sender cancels their own pending request. */
const cancelRequest = async (myId: string, requestId: string) => {
  const req = await prisma.friendRequest.findFirst({
    where: { id: requestId, fromId: myId, status: 'pending' },
  });
  if (!req) throw new AppError(httpStatus.NOT_FOUND, 'Request not found');
  await prisma.friendRequest.delete({ where: { id: req.id } });
  return true;
};

/** All accepted friendships, flattened to the counterpart's info. */
const listFriends = async (myId: string) => {
  const rows = await prisma.friendRequest.findMany({
    where: {
      status: 'accepted',
      OR: [{ fromId: myId }, { toId: myId }],
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      from: { select: userSelect },
      to: { select: userSelect },
    },
  });
  return rows.map(r => ({
    friendedAt: r.updatedAt,
    user: r.fromId === myId ? r.to : r.from,
  }));
};

/** Remove a friend (deletes the accepted edge between the two users). */
const removeFriend = async (myId: string, userId: string) => {
  const edge = await prisma.friendRequest.findFirst({
    where: {
      status: 'accepted',
      OR: [
        { fromId: myId, toId: userId },
        { fromId: userId, toId: myId },
      ],
    },
  });
  if (!edge) throw new AppError(httpStatus.NOT_FOUND, 'Not friends');
  await prisma.friendRequest.delete({ where: { id: edge.id } });
  return true;
};

export const FriendsServices = {
  sendRequest,
  listRequests,
  acceptRequest,
  declineRequest,
  cancelRequest,
  listFriends,
  removeFriend,
};
