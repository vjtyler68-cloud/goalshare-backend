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
    assignedRepId: p.assignedRepId ?? null,
    assignedRepName: p.assignedRepName ?? null,
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

/**
 * List pins for an org. Admin → all; a rep → pins they dropped (repId) OR pins
 * the admin assigned to them (assignedRepId). Server-enforced.
 */
const listPins = async (userId: string, orgId: string) => {
  const m = await assertMember(userId, orgId);
  const where: any = { orgId };
  if (m.role !== 'admin') {
    where.OR = [{ repId: userId }, { assignedRepId: userId }];
  }
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

/**
 * Assign (or unassign) a pin to a rep — admin only. An empty `repId` clears the
 * assignment. The target must be an active member of the pin's org.
 */
const assignPin = async (userId: string, pinId: string, body: any) => {
  if (!pinId || !OID.test(pinId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Bad pin id.');
  }
  const pin = await prisma.canvassPin.findUnique({ where: { id: pinId } });
  if (!pin) throw new AppError(httpStatus.NOT_FOUND, 'Pin not found.');

  const m = await membershipIn(userId, pin.orgId);
  if (m?.role !== 'admin') {
    throw new AppError(httpStatus.FORBIDDEN, 'Only an admin can assign leads.');
  }

  const repId = (body?.repId ?? '').toString().trim();

  // Empty repId → clear the assignment.
  if (!repId) {
    const cleared = await prisma.canvassPin.update({
      where: { id: pinId },
      data: {
        assignedRepId: null,
        assignedRepName: null,
        updatedAt: new Date(),
      },
    });
    return shapePin(cleared);
  }

  if (!OID.test(repId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Bad rep id.');
  }

  // The target must be an active member of the same org.
  const target = await prisma.orgMembership.findFirst({
    where: { orgId: pin.orgId, userId: repId, active: true },
  });
  if (!target) {
    throw new AppError(httpStatus.BAD_REQUEST, 'That rep is not on this team.');
  }

  const repUser = await prisma.user.findUnique({
    where: { id: repId },
    select: { fullName: true },
  });
  const repName =
    (body?.repName ?? '').toString().trim() || repUser?.fullName || 'Rep';

  const updated = await prisma.canvassPin.update({
    where: { id: pinId },
    data: {
      assignedRepId: repId,
      assignedRepName: repName,
      updatedAt: new Date(),
    },
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

// ── Territories (drawn areas assigned to reps) ──────────────────────────────

const assertAdmin = async (userId: string, orgId: string) => {
  const m = await assertMember(userId, orgId);
  if (m.role !== 'admin') {
    throw new AppError(httpStatus.FORBIDDEN, 'Only an admin can do that.');
  }
  return m;
};

const shapeTerritory = (t: any) => {
  let points: any[] = [];
  try {
    points = t.points ? JSON.parse(t.points) : [];
  } catch {
    points = [];
  }
  return {
    id: t.id,
    orgId: t.orgId,
    name: t.name,
    color: t.color,
    points,
    assignedRepIds: t.assignedRepIds ?? [],
    assignedRepNames: t.assignedRepNames ?? [],
    createdBy: t.createdBy,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
};

const normPoints = (raw: any): { lat: number; lng: number }[] =>
  (Array.isArray(raw) ? raw : [])
    .map((p: any) => ({ lat: Number(p?.lat), lng: Number(p?.lng) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

/** Draw a territory (admin only). Needs a polygon of >= 3 points. */
const createTerritory = async (userId: string, orgId: string, body: any) => {
  await assertAdmin(userId, orgId);
  const points = normPoints(body?.points);
  if (points.length < 3) {
    throw new AppError(httpStatus.BAD_REQUEST, 'An area needs at least 3 points.');
  }
  const repIds = (Array.isArray(body?.assignedRepIds) ? body.assignedRepIds : [])
    .map((s: any) => s.toString())
    .filter((s: string) => OID.test(s));
  const repNames = (Array.isArray(body?.assignedRepNames)
    ? body.assignedRepNames
    : []
  ).map((s: any) => s.toString());

  const t = await prisma.canvassTerritory.create({
    data: {
      orgId,
      name: (body?.name || 'Territory').toString().slice(0, 60),
      color: (body?.color || '#F59E0B').toString().slice(0, 16),
      points: JSON.stringify(points),
      assignedRepIds: repIds,
      assignedRepNames: repNames,
      createdBy: userId,
    },
  });
  return shapeTerritory(t);
};

/** Admin → every area; a rep → only areas assigned to them. */
const listTerritories = async (userId: string, orgId: string) => {
  const m = await assertMember(userId, orgId);
  const where: any = { orgId };
  if (m.role !== 'admin') where.assignedRepIds = { has: userId };
  const ts = await prisma.canvassTerritory.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: 500,
  });
  return ts.map(shapeTerritory);
};

/** Rename / recolor / reshape / reassign an area (admin only). */
const updateTerritory = async (
  userId: string,
  territoryId: string,
  body: any,
) => {
  if (!territoryId || !OID.test(territoryId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Bad territory id.');
  }
  const t = await prisma.canvassTerritory.findUnique({
    where: { id: territoryId },
  });
  if (!t) throw new AppError(httpStatus.NOT_FOUND, 'Territory not found.');
  await assertAdmin(userId, t.orgId);

  const data: any = { updatedAt: new Date() };
  if (typeof body?.name === 'string') data.name = body.name.slice(0, 60);
  if (typeof body?.color === 'string') data.color = body.color.slice(0, 16);
  if (Array.isArray(body?.points)) {
    const pts = normPoints(body.points);
    if (pts.length >= 3) data.points = JSON.stringify(pts);
  }
  if (Array.isArray(body?.assignedRepIds)) {
    data.assignedRepIds = body.assignedRepIds
      .map((s: any) => s.toString())
      .filter((s: string) => OID.test(s));
  }
  if (Array.isArray(body?.assignedRepNames)) {
    data.assignedRepNames = body.assignedRepNames.map((s: any) => s.toString());
  }

  const updated = await prisma.canvassTerritory.update({
    where: { id: territoryId },
    data,
  });
  return shapeTerritory(updated);
};

const deleteTerritory = async (userId: string, territoryId: string) => {
  if (!territoryId || !OID.test(territoryId)) return { ok: true };
  const t = await prisma.canvassTerritory.findUnique({
    where: { id: territoryId },
  });
  if (!t) return { ok: true };
  await assertAdmin(userId, t.orgId);
  await prisma.canvassTerritory.delete({ where: { id: territoryId } });
  return { ok: true };
};

// ── Property enrichment (home + owner details) ──────────────────────────────
// Looks up public property + assessor detail for an address via a data
// provider. The provider key lives in an env var so it can be swapped without
// an app release; when it's unset the app just shows a "not set up" state.

const latestAssessedValue = (rec: any): number | null => {
  const ta = rec?.taxAssessments;
  if (!ta || typeof ta !== 'object') return null;
  const years = Object.keys(ta).sort();
  if (!years.length) return null;
  const latest = ta[years[years.length - 1]];
  const v = latest?.value;
  return typeof v === 'number' ? v : null;
};

const ownerName = (rec: any): string => {
  const o = rec?.owner;
  if (!o) return '';
  if (Array.isArray(o.names) && o.names.length) return o.names.join(' & ');
  if (typeof o.name === 'string') return o.name;
  return '';
};

/** Enrich an address with home + owner detail. Any org member may look up. */
const enrichAddress = async (
  userId: string,
  orgId: string,
  address: string,
) => {
  await assertMember(userId, orgId);
  const key = process.env.RENTCAST_API_KEY;
  if (!key) {
    return { configured: false, found: false, data: null };
  }
  const addr = (address || '').trim();
  if (!addr) {
    throw new AppError(httpStatus.BAD_REQUEST, 'address required.');
  }
  try {
    const doFetch: any = (globalThis as any).fetch;
    const url = `https://api.rentcast.io/v1/properties?address=${encodeURIComponent(
      addr,
    )}`;
    const resp = await doFetch(url, {
      headers: { 'X-Api-Key': key, accept: 'application/json' },
    });
    if (!resp.ok) {
      return { configured: true, found: false, data: null };
    }
    const json = await resp.json();
    const rec = Array.isArray(json) ? json[0] : json;
    if (!rec) {
      return { configured: true, found: false, data: null };
    }
    return {
      configured: true,
      found: true,
      data: {
        address: rec.formattedAddress ?? addr,
        owner: ownerName(rec),
        ownerOccupied: rec.ownerOccupied ?? null,
        yearBuilt: rec.yearBuilt ?? null,
        squareFootage: rec.squareFootage ?? null,
        lotSize: rec.lotSize ?? null,
        bedrooms: rec.bedrooms ?? null,
        bathrooms: rec.bathrooms ?? null,
        propertyType: rec.propertyType ?? null,
        lastSalePrice: rec.lastSalePrice ?? null,
        lastSaleDate: rec.lastSaleDate ?? null,
        assessedValue: latestAssessedValue(rec),
      },
    };
  } catch {
    return { configured: true, found: false, data: null };
  }
};

export const CanvassServices = {
  createPin,
  listPins,
  updatePin,
  assignPin,
  deletePin,
  createTerritory,
  listTerritories,
  updateTerritory,
  deleteTerritory,
  enrichAddress,
};
