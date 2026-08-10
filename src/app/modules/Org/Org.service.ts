import { PrismaClient } from '@prisma/client';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';

const prisma = new PrismaClient();

const OID = /^[a-f0-9]{24}$/i;
const VALID_TYPES = ['school', 'salesOrg', 'gym'];

// Owner accounts may belong to MULTIPLE orgs (everyone else is one-org).
// Configurable via OWNER_EMAILS (comma-separated); defaults to the app owner.
const OWNER_EMAILS = (process.env.OWNER_EMAILS || 'vjtyler68@gmail.com')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

const isOwner = async (userId: string): Promise<boolean> => {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  return !!u && OWNER_EMAILS.includes((u.email || '').toLowerCase());
};

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
  if (existing && !(await isOwner(userId))) {
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
  if (existing && !(await isOwner(userId))) {
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
  // Even an owner can't join the same org twice.
  const already = await prisma.orgMembership.findFirst({
    where: { orgId: org.id, userId, active: true },
  });
  if (already) {
    throw new AppError(httpStatus.CONFLICT, 'You are already in this org.');
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
  mapUrl: org.mapUrl ?? null,
  mapLabel: org.mapLabel ?? null,
  bookingUrl: org.bookingUrl ?? null,
  bookingLabel: org.bookingLabel ?? null,
  role,
  isAdmin: role === 'admin',
});

/** The current user's active org + their role, or null. */
const getMine = async (userId: string) => {
  const owner = await isOwner(userId);
  const m = await myActiveMembership(userId);
  if (!m) return { org: null, isOwner: owner };
  const org = await prisma.organization.findUnique({ where: { id: m.orgId } });
  if (!org) return { org: null, isOwner: owner };
  return { org: shapeOrg(org, m.role), isOwner: owner };
};

/** ALL of the user's active orgs (owners can have several) + the owner flag. */
const getMyOrgs = async (userId: string) => {
  const owner = await isOwner(userId);
  const memberships = await prisma.orgMembership.findMany({
    where: { userId, active: true },
    orderBy: { joinedAt: 'asc' },
  });
  const orgs: any[] = [];
  for (const m of memberships) {
    const org = await prisma.organization.findUnique({ where: { id: m.orgId } });
    if (org) orgs.push(shapeOrg(org, m.role));
  }
  return { orgs, isOwner: owner };
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

/** Leave an org — soft-delete the membership (kept for records). With a
 *  specific orgId (owners have several) leaves that one; otherwise the active
 *  membership. */
const leaveOrg = async (userId: string, body: any) => {
  const orgId = (body?.orgId ?? '').toString();
  const m = orgId && OID.test(orgId)
    ? await prisma.orgMembership.findFirst({
        where: { orgId, userId, active: true },
      })
    : await myActiveMembership(userId);
  if (!m) return { ok: true };
  await prisma.orgMembership.update({
    where: { id: m.id },
    data: { active: false },
  });
  return { ok: true };
};

/** Set (or clear) the org's Territory Map link. Admin only. An empty mapUrl
 *  removes the map. The link must carry a URI scheme (https:// or an app link). */
const setMap = async (userId: string, orgId: string, body: any) => {
  if (!orgId || !OID.test(orgId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Bad org id.');
  }
  const mine = await prisma.orgMembership.findFirst({
    where: { orgId, userId, active: true },
  });
  if (!mine || mine.role !== 'admin') {
    throw new AppError(httpStatus.FORBIDDEN, 'Admins only.');
  }
  const raw = (body?.mapUrl ?? '').toString().trim();
  let mapUrl: string | null = null;
  if (raw) {
    // Require a scheme (https://…, or an app deep link like fieldmaps://…).
    if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Enter a valid map link (it should start with https:// or an app link).',
      );
    }
    mapUrl = raw.slice(0, 2000);
  }
  const label = (body?.mapLabel ?? '').toString().trim();
  const mapLabel = label ? label.slice(0, 60) : null;
  const org = await prisma.organization.update({
    where: { id: orgId },
    data: { mapUrl, mapLabel },
  });
  return { org: shapeOrg(org, mine.role) };
};

/** Set (or clear) the org's appointment scheduler (a booking widget URL). Admin
 *  only. An empty bookingUrl removes it. Must be an http(s) link. */
const setBooking = async (userId: string, orgId: string, body: any) => {
  if (!orgId || !OID.test(orgId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Bad org id.');
  }
  const mine = await prisma.orgMembership.findFirst({
    where: { orgId, userId, active: true },
  });
  if (!mine || mine.role !== 'admin') {
    throw new AppError(httpStatus.FORBIDDEN, 'Admins only.');
  }
  const raw = (body?.bookingUrl ?? '').toString().trim();
  let bookingUrl: string | null = null;
  if (raw) {
    // A booking widget is loaded in a web view, so require http(s).
    if (!/^https?:\/\//i.test(raw)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Enter a valid scheduler link (it should start with https://).',
      );
    }
    bookingUrl = raw.slice(0, 2000);
  }
  const label = (body?.bookingLabel ?? '').toString().trim();
  const bookingLabel = label ? label.slice(0, 60) : null;
  const org = await prisma.organization.update({
    where: { id: orgId },
    data: { bookingUrl, bookingLabel },
  });
  return { org: shapeOrg(org, mine.role) };
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
};
