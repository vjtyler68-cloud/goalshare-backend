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

export const OrgServices = {
  createOrg,
  joinOrg,
  getMine,
  getRoster,
  pushSummary,
  leaveOrg,
};
