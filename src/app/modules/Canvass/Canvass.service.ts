import { PrismaClient } from '@prisma/client';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';

const prisma = new PrismaClient();
const OID = /^[a-f0-9]{24}$/i;

/** A user's active membership in an org (or null). */
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

const shapePin = (p: any) => {
  let history: any[] = [];
  try {
    history = p.statusHistory ? JSON.parse(p.statusHistory) : [];
  } catch {
    history = [];
  }
  return {
    id: p.id,
    orgId: p.orgId,
    repId: p.repId,
    repName: p.repName,
    lat: p.lat,
    lng: p.lng,
    address: p.address,
    city: p.city,
    state: p.state,
    zip: p.zip,
    status: p.status,
    statusHistory: history,
    homeownerName: p.homeownerName,
    notes: p.notes,
    phone: p.phone,
    visitCount: p.visitCount,
    lastVisited: p.lastVisited,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
};

/** Drop a pin. The rep is always the caller; membership is required. */
const createPin = async (userId: string, orgId: string, body: any) => {
  await assertMember(userId, orgId);
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'lat/lng required.');
  }
  const status = (body?.status ?? 'NH').toString();
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true },
  });
  const now = new Date();
  const pin = await prisma.canvassPin.create({
    data: {
      orgId,
      repId: userId,
      repName: me?.fullName || 'Rep',
      lat,
      lng,
      address: (body?.address ?? '').toString(),
      city: (body?.city ?? '').toString(),
      state: (body?.state ?? '').toString(),
      zip: (body?.zip ?? '').toString(),
      status,
      statusHistory: JSON.stringify([
        { status, at: now.toISOString(), repId: userId },
      ]),
      homeownerName: body?.homeownerName ?? null,
      notes: body?.notes ?? null,
      phone: body?.phone ?? null,
      visitCount: 1,
      lastVisited: now,
    },
  });
  return shapePin(pin);
};

/** List pins for an org. Admin → all; rep → only their own (server-enforced). */
const listPins = async (userId: string, orgId: string) => {
  const m = await assertMember(userId, orgId);
  const where: any = { orgId };
  if (m.role !== 'admin') where.repId = userId;
  const pins = await prisma.canvassPin.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: 5000,
  });
  return pins.map(shapePin);
};

const canEdit = async (userId: string, pin: any) => {
  if (pin.repId === userId) return true;
  const m = await membershipIn(userId, pin.orgId);
  return m?.role === 'admin';
};

/** Update a pin — status change appends history + bumps visitCount. */
const updatePin = async (userId: string, pinId: string, body: any) => {
  if (!pinId || !OID.test(pinId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Bad pin id.');
  }
  const pin = await prisma.canvassPin.findUnique({ where: { id: pinId } });
  if (!pin) throw new AppError(httpStatus.NOT_FOUND, 'Pin not found.');
  if (!(await canEdit(userId, pin))) {
    throw new AppError(httpStatus.FORBIDDEN, 'Not allowed.');
  }

  const data: any = { updatedAt: new Date() };
  if (typeof body?.homeownerName === 'string')
    data.homeownerName = body.homeownerName;
  if (typeof body?.notes === 'string') data.notes = body.notes;
  if (typeof body?.phone === 'string') data.phone = body.phone;
  if (typeof body?.address === 'string') data.address = body.address;

  const newStatus = body?.status?.toString();
  if (newStatus && newStatus !== pin.status) {
    let history: any[] = [];
    try {
      history = pin.statusHistory ? JSON.parse(pin.statusHistory) : [];
    } catch {
      history = [];
    }
    history.push({
      status: newStatus,
      at: new Date().toISOString(),
      repId: userId,
    });
    data.status = newStatus;
    data.statusHistory = JSON.stringify(history.slice(-100));
    data.visitCount = (pin.visitCount ?? 1) + 1;
    data.lastVisited = new Date();
  } else if (body?.revisit === true) {
    data.visitCount = (pin.visitCount ?? 1) + 1;
    data.lastVisited = new Date();
  }

  const updated = await prisma.canvassPin.update({
    where: { id: pinId },
    data,
  });
  return shapePin(updated);
};

const deletePin = async (userId: string, pinId: string) => {
  if (!pinId || !OID.test(pinId)) return { ok: true };
  const pin = await prisma.canvassPin.findUnique({ where: { id: pinId } });
  if (!pin) return { ok: true };
  if (!(await canEdit(userId, pin))) {
    throw new AppError(httpStatus.FORBIDDEN, 'Not allowed.');
  }
  await prisma.canvassPin.delete({ where: { id: pinId } });
  return { ok: true };
};

export const CanvassServices = {
  createPin,
  listPins,
  updatePin,
  deletePin,
};
