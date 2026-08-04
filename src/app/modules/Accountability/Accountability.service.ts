import { PrismaClient } from '@prisma/client';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';

const prisma = new PrismaClient();

const DAY_MS = 24 * 60 * 60 * 1000;
const CYCLE_DAYS = 7;
const MIN_CHECKINS_TO_RATE = 2;
const OID = /^[a-f0-9]{24}$/i;

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Fields a client is allowed to write. Stats + cycle state are server-owned. */
const pickProfileInput = (body: any) => ({
  displayName: (body?.displayName ?? '').toString(),
  avatarUrl: (body?.avatarUrl ?? '').toString(),
  gender: (body?.gender ?? 'Unspecified').toString(),
  focusArea: (body?.focusArea ?? '').toString(),
  monthlyGoal: (body?.monthlyGoal ?? '').toString(),
  funFact: (body?.funFact ?? '').toString(),
  timezone: (body?.timezone ?? '').toString(),
  genderPreference: (body?.genderPreference ?? 'NoPreference').toString(),
  openToOtherGoalAreas: body?.openToOtherGoalAreas !== false,
  extendPreference: (body?.extendPreference ?? 'LetsSee').toString(),
});

/** Create or update my matching profile (stats untouched). */
const upsertProfile = async (myId: string, body: any) => {
  const input = pickProfileInput(body);
  return prisma.accountabilityProfile.upsert({
    where: { userId: myId },
    create: { userId: myId, ...input },
    update: input,
  });
};

const getMyProfile = async (myId: string) =>
  prisma.accountabilityProfile.findUnique({ where: { userId: myId } });

const setOptIn = async (myId: string, optedIn: boolean) => {
  const profile = await prisma.accountabilityProfile.findUnique({
    where: { userId: myId },
  });
  if (!profile) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Set up your buddy profile first.');
  }
  return prisma.accountabilityProfile.update({
    where: { userId: myId },
    data: { optedInForNextCycle: optedIn },
  });
};

/** The user's current pairing — their profile's pinned match, else the latest
 *  active one they're part of. */
const getCurrentMatch = async (myId: string) => {
  const profile = await prisma.accountabilityProfile.findUnique({
    where: { userId: myId },
  });
  if (profile?.currentMatchId) {
    const m = await prisma.accountabilityMatch.findUnique({
      where: { id: profile.currentMatchId },
    });
    if (m) return m;
  }
  return prisma.accountabilityMatch.findFirst({
    where: { status: 'active', OR: [{ userAId: myId }, { userBId: myId }] },
    orderBy: { createdAt: 'desc' },
  });
};

const requireMyMatch = async (myId: string) => {
  const m = await getCurrentMatch(myId);
  if (!m) throw new AppError(httpStatus.NOT_FOUND, 'No active buddy.');
  return m;
};

// ── Daily Proof / check-ins ──────────────────────────────────────────────────
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

/** Check in for the day (once), optionally attaching proof. Re-calling the same
 *  day updates the proof but never double-counts (the anti-spam guard). */
const logCheckIn = async (myId: string, body: any) => {
  const m = await requireMyMatch(myId);
  const isA = m.userAId === myId;
  const date = ((body?.date ?? '').toString() || serverDate()).slice(0, 10);
  const proofUrl = (body?.proofUrl ?? '').toString();
  const note = (body?.note ?? '').toString();

  const existing = await prisma.accountabilityCheckin.findFirst({
    where: { matchId: m.id, userId: myId, date },
  });
  if (existing) {
    return prisma.accountabilityCheckin.update({
      where: { id: existing.id },
      data: {
        proofUrl: proofUrl || existing.proofUrl,
        note: note || existing.note,
      },
    });
  }
  const created = await prisma.accountabilityCheckin.create({
    data: { matchId: m.id, userId: myId, date, proofUrl, note },
  });
  // Keep the rating-gate counter roughly in sync (distinct days checked in).
  await prisma.accountabilityMatch.update({
    where: { id: m.id },
    data: isA
      ? { checkInCountA: m.checkInCountA + 1 }
      : { checkInCountB: m.checkInCountB + 1 },
  });
  return created;
};

/** The partner marks the OTHER person's proof verified or "doesn't count". */
const verifyProof = async (myId: string, body: any) => {
  const checkinId = (body?.checkinId ?? '').toString();
  const verified = body?.verified === true;
  const m = await requireMyMatch(myId);
  const c = await prisma.accountabilityCheckin.findUnique({
    where: { id: checkinId },
  });
  if (!c || c.matchId !== m.id) {
    throw new AppError(httpStatus.NOT_FOUND, 'Check-in not found.');
  }
  if (c.userId === myId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You can only verify your buddy.');
  }
  await prisma.accountabilityCheckin.update({
    where: { id: c.id },
    data: { verified },
  });
  return { ok: true };
};

/** Recent days for both users + the shared "Our Streak" (consecutive days where
 *  BOTH checked in and neither proof was rejected). */
const getCheckins = async (myId: string) => {
  const empty = { ourStreak: 0, days: [] as any[] };
  const m = await getCurrentMatch(myId);
  if (!m) return empty;
  const rows = await prisma.accountabilityCheckin.findMany({
    where: { matchId: m.id },
    orderBy: { date: 'desc' },
  });
  const shape = (c: any) =>
    c ? { id: c.id, proofUrl: c.proofUrl, note: c.note, verified: c.verified } : null;
  const byDate: Record<string, { mine?: any; buddy?: any }> = {};
  for (const r of rows) {
    byDate[r.date] ||= {};
    if (r.userId === myId) byDate[r.date].mine = r;
    else byDate[r.date].buddy = r;
  }
  const counts = (rec: { mine?: any; buddy?: any } | undefined) =>
    !!rec &&
    !!rec.mine &&
    !!rec.buddy &&
    rec.mine.verified !== false &&
    rec.buddy.verified !== false;

  const countingDates = Object.keys(byDate).filter(d => counts(byDate[d]));
  let ourStreak = 0;
  if (countingDates.length) {
    countingDates.sort();
    const set = new Set(countingDates);
    let cur = countingDates[countingDates.length - 1];
    ourStreak = 1;
    while (set.has(addDays(cur, -1))) {
      ourStreak++;
      cur = addDays(cur, -1);
    }
  }

  const days = Object.keys(byDate)
    .sort()
    .reverse()
    .slice(0, 21)
    .map(date => ({
      date,
      counts: counts(byDate[date]),
      mine: shape(byDate[date].mine),
      buddy: shape(byDate[date].buddy),
    }));

  return { ourStreak, days };
};

const requestExtend = async (myId: string, value: boolean) => {
  const m = await requireMyMatch(myId);
  const isA = m.userAId === myId;
  return prisma.accountabilityMatch.update({
    where: { id: m.id },
    data: isA ? { extendRequestedByA: value } : { extendRequestedByB: value },
  });
};

/** Rate my buddy for this cycle. Gated behind >= 2 check-ins, once only.
 *  Updates the BUDDY's public reputation (running average) — the real
 *  cross-user piece — and frees me to be matched again. */
const submitRating = async (myId: string, stars: number, comment: string) => {
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Rating must be 1–5.');
  }
  const m = await requireMyMatch(myId);
  const isA = m.userAId === myId;
  const myCheckIns = isA ? m.checkInCountA : m.checkInCountB;
  const already = isA ? m.userARating : m.userBRating;
  if (myCheckIns < MIN_CHECKINS_TO_RATE) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Log at least ${MIN_CHECKINS_TO_RATE} check-ins before rating.`,
    );
  }
  if (already != null) {
    throw new AppError(httpStatus.CONFLICT, 'You already rated this cycle.');
  }
  const now = new Date();
  const buddyId = isA ? m.userBId : m.userAId;

  await prisma.accountabilityMatch.update({
    where: { id: m.id },
    data: isA
      ? { userARating: stars, userARatedAt: now, userAComment: comment }
      : { userBRating: stars, userBRatedAt: now, userBComment: comment },
  });

  const buddy = await prisma.accountabilityProfile.findUnique({
    where: { userId: buddyId },
  });
  if (buddy) {
    const newAvg =
      (buddy.avgRating * buddy.totalRatings + stars) / (buddy.totalRatings + 1);
    await prisma.accountabilityProfile.update({
      where: { userId: buddyId },
      data: {
        avgRating: round3(newAvg),
        totalRatings: buddy.totalRatings + 1,
        cyclesCompleted: buddy.cyclesCompleted + 1,
      },
    });
  }

  // Free me for the next cycle.
  await prisma.accountabilityProfile
    .update({ where: { userId: myId }, data: { currentMatchId: null } })
    .catch(() => undefined);

  return { ok: true };
};

// ── Goals shared with the buddy ──────────────────────────────────────────────
/** Store the user's goals (a JSON array) so their buddy can see what they're
 *  working toward. Creates a minimal profile row if none exists yet. */
const setGoals = async (myId: string, body: any) => {
  const goals = body?.goals != null ? JSON.stringify(body.goals) : null;
  await prisma.accountabilityProfile.upsert({
    where: { userId: myId },
    create: { userId: myId, goals },
    update: { goals },
  });
  return { ok: true };
};

/** The current buddy's shared goals (empty when unmatched / none set). */
const getBuddyGoals = async (myId: string) => {
  const m = await getCurrentMatch(myId);
  if (!m) return { goals: [] as unknown[] };
  const buddyId = m.userAId === myId ? m.userBId : m.userAId;
  const bp = await prisma.accountabilityProfile.findUnique({
    where: { userId: buddyId },
  });
  if (!bp || !bp.goals) return { goals: [] as unknown[] };
  try {
    return { goals: JSON.parse(bp.goals) };
  } catch {
    return { goals: [] as unknown[] };
  }
};

// ── Weekly pairing ──────────────────────────────────────────────────────────
const shuffle = <T>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const compatible = (a: any, b: any): boolean => {
  if (
    a.genderPreference === 'SameGenderOnly' &&
    (a.gender === 'Unspecified' || a.gender !== b.gender)
  ) {
    return false;
  }
  if (
    b.genderPreference === 'SameGenderOnly' &&
    (b.gender === 'Unspecified' || b.gender !== a.gender)
  ) {
    return false;
  }
  return true;
};

const freeUser = async (userId: string, matchId: string) => {
  const p = await prisma.accountabilityProfile.findUnique({ where: { userId } });
  if (p?.currentMatchId === matchId) {
    await prisma.accountabilityProfile.update({
      where: { userId },
      data: { currentMatchId: null },
    });
  }
};

const createMatch = async (a: any, b: any, now: Date) => {
  const weekEnd = new Date(now.getTime() + CYCLE_DAYS * DAY_MS);
  const match = await prisma.accountabilityMatch.create({
    data: {
      userAId: a.userId,
      userBId: b.userId,
      weekStartDate: now,
      weekEndDate: weekEnd,
      status: 'active',
      userAName: a.displayName,
      userBName: b.displayName,
      userAAvatar: a.avatarUrl,
      userBAvatar: b.avatarUrl,
      userAFocus: a.focusArea,
      userBFocus: b.focusArea,
      userAGoal: a.monthlyGoal,
      userBGoal: b.monthlyGoal,
      userAFunFact: a.funFact,
      userBFunFact: b.funFact,
      userARatingAvg: a.avgRating,
      userBRatingAvg: b.avgRating,
      userACycles: a.cyclesCompleted,
      userBCycles: b.cyclesCompleted,
    },
  });
  await prisma.accountabilityProfile.update({
    where: { userId: a.userId },
    data: { currentMatchId: match.id, optedInForNextCycle: false },
  });
  await prisma.accountabilityProfile.update({
    where: { userId: b.userId },
    data: { currentMatchId: match.id, optedInForNextCycle: false },
  });
  return match;
};

/**
 * The weekly job. Extends mutually-agreed matches, completes finished ones, then
 * pairs the opted-in pool: bucket by timezone, respect Same-gender-only, shuffle
 * (Fisher-Yates), pair greedily by compatibility. Odd leftovers stay opted-in
 * and roll into the next run. Trigger via the cron endpoint (secret-guarded).
 */
const runWeeklyPairing = async () => {
  const now = new Date();

  // 1. Extend or complete matches whose cycle has ended.
  const active = await prisma.accountabilityMatch.findMany({
    where: { status: 'active' },
  });
  let extended = 0;
  let completed = 0;
  for (const m of active) {
    if (m.weekEndDate > now) continue;
    if (m.extendRequestedByA && m.extendRequestedByB) {
      await prisma.accountabilityMatch.update({
        where: { id: m.id },
        data: {
          weekEndDate: new Date(m.weekEndDate.getTime() + CYCLE_DAYS * DAY_MS),
          extendRequestedByA: false,
          extendRequestedByB: false,
        },
      });
      extended++;
    } else {
      await prisma.accountabilityMatch.update({
        where: { id: m.id },
        data: { status: 'completed' },
      });
      await freeUser(m.userAId, m.id);
      await freeUser(m.userBId, m.id);
      completed++;
    }
  }

  // 2. Pair the opted-in, currently-unmatched pool.
  const pool = await prisma.accountabilityProfile.findMany({
    where: { optedInForNextCycle: true, currentMatchId: null },
  });
  const buckets: Record<string, any[]> = {};
  for (const p of pool) {
    const key = p.timezone || 'unknown';
    (buckets[key] ||= []).push(p);
  }

  let paired = 0;
  for (const key of Object.keys(buckets)) {
    const list = shuffle(buckets[key]);
    const used = new Set<string>();
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (used.has(a.userId)) continue;
      let partner: any = null;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (used.has(b.userId)) continue;
        if (compatible(a, b)) {
          partner = b;
          break;
        }
      }
      if (partner) {
        used.add(a.userId);
        used.add(partner.userId);
        await createMatch(a, partner, now);
        paired++;
      }
    }
  }

  return {
    ranAt: now.toISOString(),
    poolSize: pool.length,
    pairsCreated: paired,
    matchesExtended: extended,
    matchesCompleted: completed,
    held: pool.length - paired * 2,
  };
};

/** Create a match with a chosen friend (the app's friends-based path), so the
 *  pairing + daily check-ins live on the backend and both phones share them. */
const createFriendMatch = async (myId: string, body: any) => {
  const buddyId = (body?.buddyId ?? '').toString();
  if (!buddyId || buddyId === myId || !OID.test(buddyId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid buddy.');
  }
  const myProfile = await prisma.accountabilityProfile.findUnique({
    where: { userId: myId },
  });
  const meUser = await prisma.user.findUnique({
    where: { id: myId },
    select: { fullName: true, profile: true },
  });
  const buddyProfile = await prisma.accountabilityProfile.findUnique({
    where: { userId: buddyId },
  });
  const buUser = await prisma.user.findUnique({
    where: { id: buddyId },
    select: { fullName: true, profile: true },
  });

  const now = new Date();
  const match = await prisma.accountabilityMatch.create({
    data: {
      userAId: myId,
      userBId: buddyId,
      weekStartDate: now,
      weekEndDate: new Date(now.getTime() + CYCLE_DAYS * DAY_MS),
      status: 'active',
      userAName: myProfile?.displayName || meUser?.fullName || 'You',
      userBName:
        (body?.buddyName ?? '').toString() ||
        buddyProfile?.displayName ||
        buUser?.fullName ||
        'Buddy',
      userAAvatar: myProfile?.avatarUrl || meUser?.profile || '',
      userBAvatar:
        (body?.buddyAvatar ?? '').toString() ||
        buddyProfile?.avatarUrl ||
        buUser?.profile ||
        '',
      userAFocus: myProfile?.focusArea || '',
      userBFocus: buddyProfile?.focusArea || '',
      userAGoal: myProfile?.monthlyGoal || '',
      userBGoal: buddyProfile?.monthlyGoal || '',
      userAFunFact: myProfile?.funFact || '',
      userBFunFact: buddyProfile?.funFact || '',
      userARatingAvg: myProfile?.avgRating || 0,
      userBRatingAvg: buddyProfile?.avgRating || 0,
      userACycles: myProfile?.cyclesCompleted || 0,
      userBCycles: buddyProfile?.cyclesCompleted || 0,
    },
  });
  if (myProfile) {
    await prisma.accountabilityProfile.update({
      where: { userId: myId },
      data: { currentMatchId: match.id, optedInForNextCycle: false },
    });
  }
  if (buddyProfile) {
    await prisma.accountabilityProfile.update({
      where: { userId: buddyId },
      data: { currentMatchId: match.id, optedInForNextCycle: false },
    });
  }
  return match;
};

export const AccountabilityServices = {
  createFriendMatch,
  upsertProfile,
  getMyProfile,
  setOptIn,
  getCurrentMatch,
  logCheckIn,
  verifyProof,
  getCheckins,
  setGoals,
  getBuddyGoals,
  requestExtend,
  submitRating,
  runWeeklyPairing,
};
