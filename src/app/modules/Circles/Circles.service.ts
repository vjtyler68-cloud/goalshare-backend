import { PrismaClient } from '@prisma/client';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';

const prisma = new PrismaClient();

const OID = /^[a-f0-9]{24}$/i;
const MAX_MEMBERS = 5;

const pad = (n: number) => n.toString().padStart(2, '0');
const serverDate = () => {
  const n = new Date();
  return `${n.getUTCFullYear()}-${pad(n.getUTCMonth() + 1)}-${pad(n.getUTCDate())}`;
};
const addDays = (dateStr: string, delta: number) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
};

const findMyCircle = (myId: string) =>
  prisma.accountabilityCircle.findFirst({ where: { memberIds: { has: myId } } });

/** Create a squad from the current user + chosen friends (3-5 total, cap 5).
 *  One active circle per user. */
const createCircle = async (myId: string, body: any) => {
  const existing = await findMyCircle(myId);
  if (existing) {
    throw new AppError(
      httpStatus.CONFLICT,
      'You are already in a circle. Leave it first.',
    );
  }
  const invited = Array.isArray(body?.memberIds)
    ? body.memberIds.map((x: unknown) => (x ?? '').toString()).filter((x: string) => OID.test(x))
    : [];
  const memberIds = Array.from(new Set([myId, ...invited])).slice(0, MAX_MEMBERS);
  if (memberIds.length < 2) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Add at least one friend.');
  }
  const users = await prisma.user.findMany({
    where: { id: { in: memberIds } },
    select: { id: true, fullName: true, profile: true },
  });
  const byId: Record<string, { fullName: string | null; profile: string | null }> = {};
  for (const u of users) byId[u.id] = u;
  const memberNames = memberIds.map(id => byId[id]?.fullName || 'Member');
  const memberAvatars = memberIds.map(id => byId[id]?.profile || '');

  return prisma.accountabilityCircle.create({
    data: {
      name: (body?.name ?? '').toString().trim() || 'Our Circle',
      ownerId: myId,
      memberIds,
      memberNames,
      memberAvatars,
    },
  });
};

const majorityThreshold = (memberCount: number) =>
  Math.max(2, Math.ceil(memberCount / 2));

/** The current user's circle with member statuses (today) + the shared streak. */
const getMyCircle = async (myId: string) => {
  const circle = await findMyCircle(myId);
  if (!circle) return { circle: null };

  const checkins = await prisma.accountabilityCircleCheckin.findMany({
    where: { circleId: circle.id },
    orderBy: { date: 'desc' },
  });

  const today = serverDate();
  // Latest proof per (user, day) and set of members present per day.
  const presentByDate: Record<string, Set<string>> = {};
  const todayByUser: Record<string, { proofUrl: string; note: string }> = {};
  for (const c of checkins) {
    (presentByDate[c.date] ||= new Set()).add(c.userId);
    if (c.date === today && !todayByUser[c.userId]) {
      todayByUser[c.userId] = { proofUrl: c.proofUrl, note: c.note };
    }
  }

  const threshold = majorityThreshold(circle.memberIds.length);
  const shielded = new Set(circle.shieldedDates);
  const counts = (date: string) =>
    (presentByDate[date]?.size ?? 0) >= threshold || shielded.has(date);

  // Streak = consecutive counting days ending at the most recent counting day.
  const countingDates = Object.keys(presentByDate)
    .concat(circle.shieldedDates)
    .filter(counts);
  let ourStreak = 0;
  if (countingDates.length) {
    const set = new Set(countingDates);
    const sorted = Array.from(set).sort();
    let cur = sorted[sorted.length - 1];
    ourStreak = 1;
    while (set.has(addDays(cur, -1))) {
      ourStreak++;
      cur = addDays(cur, -1);
    }
  }

  const members = circle.memberIds.map((id, i) => ({
    id,
    name: circle.memberNames[i] || 'Member',
    avatar: circle.memberAvatars[i] || '',
    isMe: id === myId,
    checkedInToday: !!todayByUser[id],
    proofUrl: todayByUser[id]?.proofUrl || '',
  }));

  return {
    circle: {
      id: circle.id,
      name: circle.name,
      ownerId: circle.ownerId,
      shields: circle.shields,
      memberCount: circle.memberIds.length,
      threshold,
    },
    members,
    ourStreak,
    todayCount: presentByDate[today]?.size ?? 0,
  };
};

const checkinCircle = async (myId: string, body: any) => {
  const circle = await findMyCircle(myId);
  if (!circle) throw new AppError(httpStatus.NOT_FOUND, 'You are not in a circle.');
  const date = ((body?.date ?? '').toString() || serverDate()).slice(0, 10);
  const proofUrl = (body?.proofUrl ?? '').toString();
  const note = (body?.note ?? '').toString();
  const existing = await prisma.accountabilityCircleCheckin.findFirst({
    where: { circleId: circle.id, userId: myId, date },
  });
  if (existing) {
    return prisma.accountabilityCircleCheckin.update({
      where: { id: existing.id },
      data: {
        proofUrl: proofUrl || existing.proofUrl,
        note: note || existing.note,
      },
    });
  }
  return prisma.accountabilityCircleCheckin.create({
    data: { circleId: circle.id, userId: myId, date, proofUrl, note },
  });
};

/** Burn a shield to save a day's streak (defaults to yesterday). */
const burnShield = async (myId: string, body: any) => {
  const circle = await findMyCircle(myId);
  if (!circle) throw new AppError(httpStatus.NOT_FOUND, 'You are not in a circle.');
  if (circle.shields <= 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'No shields left this cycle.');
  }
  const date =
    ((body?.date ?? '').toString() || addDays(serverDate(), -1)).slice(0, 10);
  if (circle.shieldedDates.includes(date)) {
    return { ok: true, shields: circle.shields };
  }
  const updated = await prisma.accountabilityCircle.update({
    where: { id: circle.id },
    data: {
      shields: circle.shields - 1,
      shieldedDates: { push: date },
    },
  });
  return { ok: true, shields: updated.shields };
};

const leaveCircle = async (myId: string) => {
  const circle = await findMyCircle(myId);
  if (!circle) return { ok: true };
  const idx = circle.memberIds.indexOf(myId);
  if (idx === -1) return { ok: true };
  const memberIds = circle.memberIds.filter((_, i) => i !== idx);
  if (memberIds.length === 0) {
    await prisma.accountabilityCircle.delete({ where: { id: circle.id } });
    return { ok: true };
  }
  await prisma.accountabilityCircle.update({
    where: { id: circle.id },
    data: {
      memberIds,
      memberNames: circle.memberNames.filter((_, i) => i !== idx),
      memberAvatars: circle.memberAvatars.filter((_, i) => i !== idx),
    },
  });
  return { ok: true };
};

export const CirclesServices = {
  createCircle,
  getMyCircle,
  checkinCircle,
  burnShield,
  leaveCircle,
};
