import { PrismaClient } from '@prisma/client';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';

const prisma = new PrismaClient();

const OID = /^[a-f0-9]{24}$/i;
const VALID_TYPES = ['school', 'salesOrg', 'gym'];

// Unambiguous alphabet (no 0/O/1/I) for a human-shareable 6-char code.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const genCode = () => {
  let s = '';
  for (let i = 0; i < 6; i++) {
    s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return s;
};

const myActiveMembership = (userId: string) =>
  prisma.orgMembership.findFirst({ where: { userId, active: true } });

/** Create an org — the creator becomes its admin. One active org per user. */
const createOrg = async (userId: string, body: any) => {
  const existing = await myActiveMembership(userId);
  if (existing) {
    throw new AppError(
      httpStatus.CONFLICT,
      'You are already in an organization. Leave it first.',
    );
  }
  const name = (body?.name ?? '').toString().trim();
  if (!name) throw new AppError(httpStatus.BAD_REQUEST, 'Org name is required.');
  const orgType = (body?.orgType ?? '').toString();
  if (!VALID_TYPES.includes(orgType)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid org type.');
  }

  // Generate a unique invite code (retry on the rare collision).
  let inviteCode = genCode();
  for (let i = 0; i < 5; i++) {
    const clash = await prisma.organization.findUnique({ where: { inviteCode } });
    if (!clash) break;
    inviteCode = genCode();
  }

  const org = await prisma.organization.create({
    data: { name, orgType, inviteCode, adminUserId: userId },
  });
  await prisma.orgMembership.create({
    data: { orgId: org.id, userId, role: 'admin' },
  });
  return { org, role: 'admin' };
};

/** Join an org by invite code — the joiner becomes a member. */
const joinOrg = async (userId: string, body: any) => {
  const existing = await myActiveMembership(userId);
  if (existing) {
    throw new AppError(
      httpStatus.CONFLICT,
      'You are already in an organization. Leave it first.',
    );
  }
  const code = (body?.inviteCode ?? '').toString().trim().toUpperCase();
  if (code.length !== 6) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Enter a 6-character code.');
  }
  const org = await prisma.organization.findUnique({
    where: { inviteCode: code },
  });
  if (!org) {
    throw new AppError(httpStatus.NOT_FOUND, 'No organization with that code.');
  }
  await prisma.orgMembership.create({
    data: { orgId: org.id, userId, role: 'member' },
  });
  return { org, role: 'member' };
};

const shapeOrg = (org: any, role: string) => ({
  id: org.id,
  name: org.name,
  orgType: org.orgType,
  inviteCode: org.inviteCode,
  adminUserId: org.adminUserId,
  role,
  isAdmin: role === 'admin',
});

/** The current user's active org + their role, or null. */
const getMine = async (userId: string) => {
  const m = await myActiveMembership(userId);
  if (!m) return { org: null };
  const org = await prisma.organization.findUnique({ where: { id: m.orgId } });
  if (!org) return { org: null };
  return { org: shapeOrg(org, m.role) };
};

/** Roster for [orgId] — admin only. Members with name/avatar/joined/role. */
const getRoster = async (userId: string, orgId: string) => {
  if (!orgId || !OID.test(orgId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Bad org id.');
  }
  const mine = await prisma.orgMembership.findFirst({
    where: { orgId, userId, active: true },
  });
  if (!mine || mine.role !== 'admin') {
    throw new AppError(httpStatus.FORBIDDEN, 'Admins only.');
  }
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  const memberships = await prisma.orgMembership.findMany({
    where: { orgId, active: true },
    orderBy: { joinedAt: 'asc' },
  });
  const ids = memberships.map(m => m.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, fullName: true, profile: true },
  });
  const byId: Record<string, { fullName: string | null; profile: string | null }> =
    {};
  for (const u of users) byId[u.id] = u;

  const parse = (s: string | null) => {
    if (!s) return null;
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };
  const members = memberships.map(m => ({
    userId: m.userId,
    name: byId[m.userId]?.fullName || 'Member',
    avatar: byId[m.userId]?.profile || '',
    role: m.role,
    joinedAt: m.joinedAt,
    summary: parse(m.summaryJson),
    summaryAt: m.summaryAt,
  }));
  return {
    org: org ? shapeOrg(org, mine.role) : null,
    members,
    memberCount: members.length,
  };
};

/** Store the current user's whitelist-scoped engagement summary (a JSON map the
 *  app already scoped to the org type). Best-effort — a bad payload is ignored. */
const pushSummary = async (userId: string, body: any) => {
  const m = await myActiveMembership(userId);
  if (!m) return { ok: false };
  let summaryJson: string | null = null;
  const summary = body?.summary;
  if (summary && typeof summary === 'object') {
    try {
      summaryJson = JSON.stringify(summary);
    } catch {
      summaryJson = null;
    }
  }
  await prisma.orgMembership.update({
    where: { id: m.id },
    data: { summaryJson, summaryAt: new Date() },
  });
  return { ok: true };
};

/** Leave the current org — soft-delete the membership (kept for records). */
const leaveOrg = async (userId: string) => {
  const m = await myActiveMembership(userId);
  if (!m) return { ok: true };
  await prisma.orgMembership.update({
    where: { id: m.id },
    data: { active: false },
  });
  return { ok: true };
};

// ── Team HQ (org-private posts + goals) ───────────────────────────────────────
// Every read/write is gated on an active membership in that org, so content
// never leaks to other orgs or the public.

const membershipIn = (userId: string, orgId: string) =>
  prisma.orgMembership.findFirst({ where: { orgId, userId, active: true } });

const assertMember = async (userId: string, orgId: string) => {
  if (!orgId || !OID.test(orgId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Bad org id.');
  }
  const m = await membershipIn(userId, orgId);
  if (!m) throw new AppError(httpStatus.FORBIDDEN, 'Not a member of this org.');
  return m;
};

const shapePost = (p: any, userId: string) => ({
  id: p.id,
  kind: p.kind,
  text: p.text,
  authorId: p.authorId,
  authorName: p.authorName,
  authorAvatar: p.authorAvatar,
  likeCount: (p.likes ?? []).length,
  likedByMe: (p.likes ?? []).includes(userId),
  createdAt: p.createdAt,
});

/** The org's Team HQ: announcements, feed, and goals (with computed progress).
 *  Members only. */
const getSpace = async (userId: string, orgId: string) => {
  await assertMember(userId, orgId);

  const posts = await prisma.orgPost.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  const goals = await prisma.orgGoal.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
  });

  // Metric-goal progress = sum of members' reported numbers for that key.
  const memberships = await prisma.orgMembership.findMany({
    where: { orgId, active: true },
  });
  const sumMetric = (key: string) => {
    let total = 0;
    for (const m of memberships) {
      if (!m.summaryJson) continue;
      try {
        const s = JSON.parse(m.summaryJson);
        const v = s?.[key];
        if (typeof v === 'number') total += v;
      } catch {
        /* ignore */
      }
    }
    return total;
  };

  const announcements = posts
    .filter(p => p.kind === 'announcement')
    .map(p => shapePost(p, userId));
  const feed = posts
    .filter(p => p.kind === 'feed')
    .map(p => shapePost(p, userId));
  const shapedGoals = goals.map(g => ({
    id: g.id,
    title: g.title,
    target: g.target,
    metricKey: g.metricKey,
    progress: g.metricKey === 'manual' ? g.manualProgress : sumMetric(g.metricKey),
  }));

  return { announcements, feed, goals: shapedGoals };
};

/** Create a post. Announcements require admin; feed posts are open to members. */
const createPost = async (userId: string, orgId: string, body: any) => {
  const m = await assertMember(userId, orgId);
  const kind = (body?.kind ?? 'feed').toString() === 'announcement'
    ? 'announcement'
    : 'feed';
  if (kind === 'announcement' && m.role !== 'admin') {
    throw new AppError(httpStatus.FORBIDDEN, 'Only admins can post announcements.');
  }
  const text = (body?.text ?? '').toString().trim();
  if (!text) throw new AppError(httpStatus.BAD_REQUEST, 'Post cannot be empty.');
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true, profile: true },
  });
  const post = await prisma.orgPost.create({
    data: {
      orgId,
      authorId: userId,
      authorName: me?.fullName || 'Member',
      authorAvatar: me?.profile || '',
      kind,
      text: text.slice(0, 1000),
    },
  });
  return shapePost(post, userId);
};

const toggleLike = async (userId: string, postId: string) => {
  if (!postId || !OID.test(postId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Bad post id.');
  }
  const post = await prisma.orgPost.findUnique({ where: { id: postId } });
  if (!post) throw new AppError(httpStatus.NOT_FOUND, 'Post not found.');
  await assertMember(userId, post.orgId);
  const likes = post.likes ?? [];
  const has = likes.includes(userId);
  const updated = await prisma.orgPost.update({
    where: { id: postId },
    data: {
      likes: has
        ? { set: likes.filter(x => x !== userId) }
        : { push: userId },
    },
  });
  return shapePost(updated, userId);
};

const deletePost = async (userId: string, postId: string) => {
  if (!postId || !OID.test(postId)) return { ok: true };
  const post = await prisma.orgPost.findUnique({ where: { id: postId } });
  if (!post) return { ok: true };
  const m = await membershipIn(userId, post.orgId);
  const canDelete = post.authorId === userId || m?.role === 'admin';
  if (!canDelete) throw new AppError(httpStatus.FORBIDDEN, 'Not allowed.');
  await prisma.orgPost.delete({ where: { id: postId } });
  return { ok: true };
};

const createGoal = async (userId: string, orgId: string, body: any) => {
  const m = await assertMember(userId, orgId);
  if (m.role !== 'admin') {
    throw new AppError(httpStatus.FORBIDDEN, 'Only admins set team goals.');
  }
  const title = (body?.title ?? '').toString().trim();
  if (!title) throw new AppError(httpStatus.BAD_REQUEST, 'Goal needs a title.');
  const target = Number.isFinite(body?.target) ? Math.max(0, Math.round(body.target)) : 0;
  const metricKey = (body?.metricKey ?? 'manual').toString();
  return prisma.orgGoal.create({
    data: { orgId, title: title.slice(0, 120), target, metricKey, createdBy: userId },
  });
};

const bumpGoal = async (userId: string, goalId: string, body: any) => {
  if (!goalId || !OID.test(goalId)) throw new AppError(httpStatus.BAD_REQUEST, 'Bad id.');
  const goal = await prisma.orgGoal.findUnique({ where: { id: goalId } });
  if (!goal) throw new AppError(httpStatus.NOT_FOUND, 'Goal not found.');
  const m = await membershipIn(userId, goal.orgId);
  if (m?.role !== 'admin') throw new AppError(httpStatus.FORBIDDEN, 'Admins only.');
  const delta = Number.isFinite(body?.delta) ? Math.round(body.delta) : 0;
  const next = Math.max(0, goal.manualProgress + delta);
  return prisma.orgGoal.update({
    where: { id: goalId },
    data: { manualProgress: next },
  });
};

const deleteGoal = async (userId: string, goalId: string) => {
  if (!goalId || !OID.test(goalId)) return { ok: true };
  const goal = await prisma.orgGoal.findUnique({ where: { id: goalId } });
  if (!goal) return { ok: true };
  const m = await membershipIn(userId, goal.orgId);
  if (m?.role !== 'admin') throw new AppError(httpStatus.FORBIDDEN, 'Admins only.');
  await prisma.orgGoal.delete({ where: { id: goalId } });
  return { ok: true };
};

export const OrgServices = {
  createOrg,
  joinOrg,
  getMine,
  getRoster,
  pushSummary,
  leaveOrg,
  getSpace,
  createPost,
  toggleLike,
  deletePost,
  createGoal,
  bumpGoal,
  deleteGoal,
};
