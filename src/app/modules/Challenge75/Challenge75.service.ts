import { PrismaClient } from '@prisma/client';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';

const prisma = new PrismaClient();

// Unambiguous invite code (no 0/O/1/I/L) so it's easy to read out / text.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const genCode = () =>
  Array.from(
    { length: 6 },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
  ).join('');

const nameOf = async (userId: string): Promise<string> => {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true },
  });
  return u?.fullName || 'Member';
};

const normalizeCode = (raw: any): string =>
  (raw ?? '').toString().trim().toUpperCase();

/** Create or refresh the caller's progress row in a crew. */
const upsertMember = async (crewId: string, userId: string, body: any) => {
  const data = {
    name: await nameOf(userId),
    variantId: (body?.variantId ?? '').toString(),
    day: Number(body?.day ?? 0) || 0,
    daysCompleted: Number(body?.daysCompleted ?? 0) || 0,
    streak: Number(body?.streak ?? 0) || 0,
    completionToday: Number(body?.completionToday ?? 0) || 0,
    todayComplete: Boolean(body?.todayComplete ?? false),
  };
  const existing = await prisma.challenge75Member.findFirst({
    where: { crewId, userId },
  });
  if (existing) {
    return prisma.challenge75Member.update({
      where: { id: existing.id },
      data,
    });
  }
  return prisma.challenge75Member.create({
    data: { crewId, userId, ...data },
  });
};

const createCrew = async (userId: string, body: any) => {
  const name = (body?.name ?? '').toString().trim() || 'My 75 Crew';
  // Pick a code that isn't already taken (collisions are rare; retry a few).
  let code = genCode();
  for (let i = 0; i < 5; i++) {
    const existing = await prisma.challenge75Crew.findUnique({ where: { code } });
    if (!existing) break;
    code = genCode();
  }
  const crew = await prisma.challenge75Crew.create({
    data: { code, name, ownerId: userId, memberIds: [userId] },
  });
  await upsertMember(crew.id, userId, body);
  return { code: crew.code, name: crew.name, crewId: crew.id };
};

const joinCrew = async (userId: string, body: any) => {
  const code = normalizeCode(body?.code);
  if (!code) throw new AppError(httpStatus.BAD_REQUEST, 'A crew code is required.');
  const crew = await prisma.challenge75Crew.findUnique({ where: { code } });
  if (!crew) throw new AppError(httpStatus.NOT_FOUND, 'No crew with that code.');
  if (!crew.memberIds.includes(userId)) {
    await prisma.challenge75Crew.update({
      where: { id: crew.id },
      data: { memberIds: { push: userId } },
    });
  }
  await upsertMember(crew.id, userId, body);
  return { code: crew.code, name: crew.name, crewId: crew.id };
};

const leaveCrew = async (userId: string, body: any) => {
  const code = normalizeCode(body?.code);
  const crew = await prisma.challenge75Crew.findUnique({ where: { code } });
  if (!crew) return { left: true };
  await prisma.challenge75Crew.update({
    where: { id: crew.id },
    data: { memberIds: { set: crew.memberIds.filter(id => id !== userId) } },
  });
  await prisma.challenge75Member.deleteMany({
    where: { crewId: crew.id, userId },
  });
  return { left: true };
};

const pushProgress = async (userId: string, body: any) => {
  const code = normalizeCode(body?.code);
  if (!code) throw new AppError(httpStatus.BAD_REQUEST, 'A crew code is required.');
  const crew = await prisma.challenge75Crew.findUnique({ where: { code } });
  if (!crew) throw new AppError(httpStatus.NOT_FOUND, 'No crew with that code.');
  if (!crew.memberIds.includes(userId)) {
    throw new AppError(httpStatus.FORBIDDEN, 'You are not in this crew.');
  }
  await upsertMember(crew.id, userId, body);
  return { ok: true };
};

const listMembers = async (userId: string, codeRaw: string) => {
  const code = normalizeCode(codeRaw);
  if (!code) throw new AppError(httpStatus.BAD_REQUEST, 'A crew code is required.');
  const crew = await prisma.challenge75Crew.findUnique({ where: { code } });
  if (!crew) throw new AppError(httpStatus.NOT_FOUND, 'No crew with that code.');
  if (!crew.memberIds.includes(userId)) {
    throw new AppError(httpStatus.FORBIDDEN, 'You are not in this crew.');
  }
  const members = await prisma.challenge75Member.findMany({
    where: { crewId: crew.id },
    orderBy: { daysCompleted: 'desc' },
  });
  return {
    code: crew.code,
    name: crew.name,
    members: members.map(m => ({
      userId: m.userId,
      name: m.name,
      variantId: m.variantId,
      day: m.day,
      daysCompleted: m.daysCompleted,
      streak: m.streak,
      completionToday: m.completionToday,
      todayComplete: m.todayComplete,
    })),
  };
};

export const Challenge75Services = {
  createCrew,
  joinCrew,
  leaveCrew,
  pushProgress,
  listMembers,
};
