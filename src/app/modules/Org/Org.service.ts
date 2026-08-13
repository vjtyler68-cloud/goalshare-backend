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

/** May this user belong to MORE than one org at once? True for the owner
 *  allowlist AND for anyone who already ADMINS an org — so an org creator can
 *  spin up additional organizations (multi-site, demos for schools/churches/
 *  companies) without ever leaving their current one. Reliable: it keys off
 *  real admin membership, not just an email match. */
const canHoldMultiple = async (userId: string): Promise<boolean> => {
  if (await isOwner(userId)) return true;
  const adminOf = await prisma.orgMembership.findFirst({
    where: { userId, role: 'admin', active: true },
  });
  return !!adminOf;
};

/** Create an org — the creator becomes its admin. One active org per user. */
const createOrg = async (userId: string, body: any) => {
  const existing = await myActiveMembership(userId);
  if (existing && !(await canHoldMultiple(userId))) {
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
  if (existing && !(await canHoldMultiple(userId))) {
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
  taskHubEnabled: org.taskHubEnabled ?? false,
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

/** Turn the shared Task Hub on/off for an org. Admin only. */
const setTaskHub = async (userId: string, orgId: string, body: any) => {
  if (!orgId || !OID.test(orgId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Bad org id.');
  }
  const mine = await prisma.orgMembership.findFirst({
    where: { orgId, userId, active: true },
  });
  if (!mine || mine.role !== 'admin') {
    throw new AppError(httpStatus.FORBIDDEN, 'Admins only.');
  }
  const org = await prisma.organization.update({
    where: { id: orgId },
    data: { taskHubEnabled: body?.enabled === true },
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

/** Promote a member to admin (co-admin) or demote an admin back to member.
 *  Admin only. The org's FOUNDING admin (adminUserId) can never be demoted, so
 *  an org always keeps at least one admin. Membership.role is the source of
 *  truth; the org's additionalAdminIds array is kept in sync alongside it. */
const setMemberRole = async (userId: string, orgId: string, body: any) => {
  if (!orgId || !OID.test(orgId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Bad org id.');
  }
  const mine = await prisma.orgMembership.findFirst({
    where: { orgId, userId, active: true },
  });
  if (!mine || mine.role !== 'admin') {
    throw new AppError(httpStatus.FORBIDDEN, 'Admins only.');
  }
  const targetId = (body?.userId ?? '').toString();
  if (!targetId || !OID.test(targetId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Bad member id.');
  }
  const role = (body?.role ?? '').toString();
  if (role !== 'admin' && role !== 'member') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Role must be admin or member.');
  }
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new AppError(httpStatus.NOT_FOUND, 'Org not found.');
  // The founder is always an admin — blocking their demotion prevents an org
  // from ever being left with no admin.
  if (role === 'member' && targetId === org.adminUserId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'The organization owner always stays an admin.',
    );
  }
  const target = await prisma.orgMembership.findFirst({
    where: { orgId, userId: targetId, active: true },
  });
  if (!target) {
    throw new AppError(httpStatus.NOT_FOUND, 'That member is not in this org.');
  }

  await prisma.orgMembership.update({
    where: { id: target.id },
    data: { role },
  });
  // Keep the org's co-admin list accurate for anything that reads it.
  const set = new Set(org.additionalAdminIds ?? []);
  if (role === 'admin') {
    set.add(targetId);
  } else {
    set.delete(targetId);
  }
  await prisma.organization.update({
    where: { id: orgId },
    data: { additionalAdminIds: Array.from(set) },
  });
  return { ok: true, userId: targetId, role };
};

// ── Task Hub (org-private tasks + projects) ───────────────────────────────────
// Shared, assignable tasks for the org's capture → organize → prioritize →
// schedule → assign → follow-up → review → report workflow. Every read/write is
// gated on membership in that org (assertMember), so tasks never leak.

const TASK_STATUS = ['todo', 'in_progress', 'waiting', 'approval', 'done'];
const TASK_PRIORITY = ['low', 'medium', 'high', 'urgent'];
const RECUR = ['none', 'daily', 'weekly', 'monthly', 'quarterly'];

const oidOrNull = (v: any): string | null => {
  const s = (v ?? '').toString();
  return OID.test(s) ? s : null;
};

// undefined = field not provided (leave unchanged); null = explicit clear.
const parseDate = (v: any): Date | null | undefined => {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
};

const nextDue = (from: Date, rule: string): Date => {
  const d = new Date(from);
  switch (rule) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'quarterly':
      d.setMonth(d.getMonth() + 3);
      break;
  }
  return d;
};

const shapeTask = (t: any) => ({
  id: t.id,
  orgId: t.orgId,
  title: t.title,
  notes: t.notes ?? '',
  status: t.status,
  priority: t.priority,
  dueAt: t.dueAt,
  followUpAt: t.followUpAt,
  waitingOn: t.waitingOn ?? '',
  assigneeId: t.assigneeId ?? null,
  assigneeName: t.assigneeName ?? '',
  projectId: t.projectId ?? null,
  dependsOnId: t.dependsOnId ?? null,
  meetingId: t.meetingId ?? null,
  recurRule: t.recurRule ?? 'none',
  recurEnd: t.recurEnd,
  createdBy: t.createdBy,
  createdByName: t.createdByName ?? '',
  completedAt: t.completedAt,
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
});

const shapeProject = (p: any) => ({
  id: p.id,
  orgId: p.orgId,
  name: p.name,
  color: p.color ?? '',
  createdBy: p.createdBy,
  createdAt: p.createdAt,
});

/** Everything the Task Hub needs for an org: all tasks + all projects. */
const listTasks = async (userId: string, orgId: string) => {
  await assertMember(userId, orgId);
  const [tasks, projects] = await Promise.all([
    prisma.orgTask.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      take: 3000,
    }),
    prisma.orgProject.findMany({
      where: { orgId },
      orderBy: { createdAt: 'asc' },
    }),
  ]);
  return { tasks: tasks.map(shapeTask), projects: projects.map(shapeProject) };
};

const createTask = async (userId: string, orgId: string, body: any) => {
  await assertMember(userId, orgId);
  const title = (body?.title ?? '').toString().trim();
  if (!title) throw new AppError(httpStatus.BAD_REQUEST, 'Task needs a title.');
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true },
  });
  const status = TASK_STATUS.includes(body?.status) ? body.status : 'todo';
  const priority = TASK_PRIORITY.includes(body?.priority)
    ? body.priority
    : 'medium';
  const recurRule = RECUR.includes(body?.recurRule) ? body.recurRule : 'none';
  const task = await prisma.orgTask.create({
    data: {
      orgId,
      title: title.slice(0, 200),
      notes: (body?.notes ?? '').toString().slice(0, 4000),
      status,
      priority,
      dueAt: parseDate(body?.dueAt) ?? null,
      followUpAt: parseDate(body?.followUpAt) ?? null,
      waitingOn: (body?.waitingOn ?? '').toString().slice(0, 200),
      assigneeId: oidOrNull(body?.assigneeId),
      assigneeName: (body?.assigneeName ?? '').toString().slice(0, 120),
      projectId: oidOrNull(body?.projectId),
      dependsOnId: oidOrNull(body?.dependsOnId),
      meetingId: oidOrNull(body?.meetingId),
      recurRule,
      recurEnd: parseDate(body?.recurEnd) ?? null,
      createdBy: userId,
      createdByName: me?.fullName || 'Member',
    },
  });
  return shapeTask(task);
};

/** Update any task field. Completing a recurring task spawns the next one. */
const updateTask = async (userId: string, taskId: string, body: any) => {
  if (!taskId || !OID.test(taskId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Bad task id.');
  }
  const task = await prisma.orgTask.findUnique({ where: { id: taskId } });
  if (!task) throw new AppError(httpStatus.NOT_FOUND, 'Task not found.');
  await assertMember(userId, task.orgId);

  const data: any = { updatedAt: new Date() };
  if (typeof body?.title === 'string' && body.title.trim()) {
    data.title = body.title.trim().slice(0, 200);
  }
  if (typeof body?.notes === 'string') data.notes = body.notes.slice(0, 4000);
  if (TASK_PRIORITY.includes(body?.priority)) data.priority = body.priority;
  if (RECUR.includes(body?.recurRule)) data.recurRule = body.recurRule;
  if (typeof body?.waitingOn === 'string') {
    data.waitingOn = body.waitingOn.slice(0, 200);
  }
  if (body && 'assigneeId' in body) data.assigneeId = oidOrNull(body.assigneeId);
  if (typeof body?.assigneeName === 'string') {
    data.assigneeName = body.assigneeName.slice(0, 120);
  }
  if (body && 'projectId' in body) data.projectId = oidOrNull(body.projectId);
  if (body && 'dependsOnId' in body) {
    data.dependsOnId = oidOrNull(body.dependsOnId);
  }
  if (body && 'meetingId' in body) data.meetingId = oidOrNull(body.meetingId);
  const due = parseDate(body?.dueAt);
  if (due !== undefined) data.dueAt = due;
  const fu = parseDate(body?.followUpAt);
  if (fu !== undefined) data.followUpAt = fu;
  const re = parseDate(body?.recurEnd);
  if (re !== undefined) data.recurEnd = re;

  let spawned: any = null;
  if (TASK_STATUS.includes(body?.status)) {
    data.status = body.status;
    if (body.status === 'done' && task.status !== 'done') {
      data.completedAt = new Date();
      if ((task.recurRule ?? 'none') !== 'none') {
        const base = task.dueAt ? new Date(task.dueAt) : new Date();
        const nd = nextDue(base, task.recurRule);
        if (!task.recurEnd || nd <= new Date(task.recurEnd)) {
          spawned = await prisma.orgTask.create({
            data: {
              orgId: task.orgId,
              title: task.title,
              notes: task.notes,
              status: 'todo',
              priority: task.priority,
              dueAt: nd,
              followUpAt: null,
              waitingOn: task.waitingOn,
              assigneeId: task.assigneeId,
              assigneeName: task.assigneeName,
              projectId: task.projectId,
              dependsOnId: null,
              recurRule: task.recurRule,
              recurEnd: task.recurEnd,
              createdBy: userId,
              createdByName: task.createdByName,
            },
          });
        }
      }
    } else if (body.status !== 'done') {
      data.completedAt = null;
    }
  }
  const updated = await prisma.orgTask.update({
    where: { id: taskId },
    data,
  });
  return {
    task: shapeTask(updated),
    spawned: spawned ? shapeTask(spawned) : null,
  };
};

const deleteTask = async (userId: string, taskId: string) => {
  if (!taskId || !OID.test(taskId)) return { ok: true };
  const task = await prisma.orgTask.findUnique({ where: { id: taskId } });
  if (!task) return { ok: true };
  await assertMember(userId, task.orgId);
  await prisma.orgTask.delete({ where: { id: taskId } });
  return { ok: true };
};

const createProject = async (userId: string, orgId: string, body: any) => {
  await assertMember(userId, orgId);
  const name = (body?.name ?? '').toString().trim();
  if (!name) throw new AppError(httpStatus.BAD_REQUEST, 'Project needs a name.');
  const project = await prisma.orgProject.create({
    data: {
      orgId,
      name: name.slice(0, 120),
      color: (body?.color ?? '').toString().slice(0, 20),
      createdBy: userId,
    },
  });
  return shapeProject(project);
};

const deleteProject = async (userId: string, projectId: string) => {
  if (!projectId || !OID.test(projectId)) return { ok: true };
  const project = await prisma.orgProject.findUnique({
    where: { id: projectId },
  });
  if (!project) return { ok: true };
  await assertMember(userId, project.orgId);
  // Detach tasks from the deleted project rather than orphaning them.
  await prisma.orgTask.updateMany({
    where: { projectId },
    data: { projectId: null },
  });
  await prisma.orgProject.delete({ where: { id: projectId } });
  return { ok: true };
};

// ── Meetings & Agenda (org-private) ───────────────────────────────────────────
const shapeMeeting = (m: any) => ({
  id: m.id,
  orgId: m.orgId,
  title: m.title,
  startAt: m.startAt,
  agenda: m.agenda ?? '',
  notes: m.notes ?? '',
  createdBy: m.createdBy,
  createdByName: m.createdByName ?? '',
  createdAt: m.createdAt,
  updatedAt: m.updatedAt,
});

const listMeetings = async (userId: string, orgId: string) => {
  await assertMember(userId, orgId);
  const meetings = await prisma.orgMeeting.findMany({
    where: { orgId },
    orderBy: { startAt: 'desc' },
    take: 1000,
  });
  return { meetings: meetings.map(shapeMeeting) };
};

const createMeeting = async (userId: string, orgId: string, body: any) => {
  await assertMember(userId, orgId);
  const title = (body?.title ?? '').toString().trim();
  if (!title) throw new AppError(httpStatus.BAD_REQUEST, 'Meeting needs a title.');
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true },
  });
  const meeting = await prisma.orgMeeting.create({
    data: {
      orgId,
      title: title.slice(0, 200),
      startAt: parseDate(body?.startAt) ?? null,
      agenda: (body?.agenda ?? '').toString().slice(0, 6000),
      notes: (body?.notes ?? '').toString().slice(0, 6000),
      createdBy: userId,
      createdByName: me?.fullName || 'Member',
    },
  });
  return shapeMeeting(meeting);
};

const updateMeeting = async (userId: string, meetingId: string, body: any) => {
  if (!meetingId || !OID.test(meetingId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Bad meeting id.');
  }
  const meeting = await prisma.orgMeeting.findUnique({
    where: { id: meetingId },
  });
  if (!meeting) throw new AppError(httpStatus.NOT_FOUND, 'Meeting not found.');
  await assertMember(userId, meeting.orgId);
  const data: any = { updatedAt: new Date() };
  if (typeof body?.title === 'string' && body.title.trim()) {
    data.title = body.title.trim().slice(0, 200);
  }
  if (typeof body?.agenda === 'string') data.agenda = body.agenda.slice(0, 6000);
  if (typeof body?.notes === 'string') data.notes = body.notes.slice(0, 6000);
  const sa = parseDate(body?.startAt);
  if (sa !== undefined) data.startAt = sa;
  const updated = await prisma.orgMeeting.update({
    where: { id: meetingId },
    data,
  });
  return shapeMeeting(updated);
};

const deleteMeeting = async (userId: string, meetingId: string) => {
  if (!meetingId || !OID.test(meetingId)) return { ok: true };
  const meeting = await prisma.orgMeeting.findUnique({
    where: { id: meetingId },
  });
  if (!meeting) return { ok: true };
  await assertMember(userId, meeting.orgId);
  // Keep the action items; just unlink them from the deleted meeting.
  await prisma.orgTask.updateMany({
    where: { meetingId },
    data: { meetingId: null },
  });
  await prisma.orgMeeting.delete({ where: { id: meetingId } });
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
  setMemberRole,
  setTaskHub,
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  createProject,
  deleteProject,
  listMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
};
