import { PrismaClient } from "@prisma/client";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import { addressKey, inPolygon } from "./Canvass.logic";

const prisma = new PrismaClient();
const OID = /^[a-f0-9]{24}$/i;

/** A user's active membership in an org (or null). */
const membershipIn = (userId: string, orgId: string) =>
  prisma.orgMembership.findFirst({ where: { orgId, userId, active: true } });

const assertMember = async (userId: string, orgId: string) => {
  if (!orgId || !OID.test(orgId)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Bad org id.");
  }
  const m = await membershipIn(userId, orgId);
  if (!m) throw new AppError(httpStatus.FORBIDDEN, "Not a member of this org.");
  // Sales Ranch access gate: until an admin opens it to the team, only admins
  // may use canvassing.
  if (m.role !== "admin") {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { canvassEnabled: true },
    });
    if (!org?.canvassEnabled) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Sales Ranch isn’t open to the team yet.",
      );
    }
  }
  return m;
};

const parseJson = (s: any, fallback: any) => {
  try {
    return s ? JSON.parse(s) : fallback;
  } catch {
    return fallback;
  }
};

const shapePin = (p: any) => {
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
    territoryId: p.territoryId ?? null,
    status: p.status,
    stage: p.stage ?? "lead",
    seeded: p.seeded ?? false,
    statusHistory: parseJson(p.statusHistory, []),
    homeownerName: p.homeownerName,
    contactEmail: p.contactEmail ?? null,
    notes: p.notes,
    notesLog: parseJson(p.notesLog, []),
    phone: p.phone,
    actionItems: parseJson(p.actionItems, {}),
    systemSizeKw: p.systemSizeKw ?? null,
    leaseRatePerMonth: p.leaseRatePerMonth ?? null,
    leaseRatePerKwh: p.leaseRatePerKwh ?? null,
    enrichment: (() => {
      try {
        return p.enrichment ? JSON.parse(p.enrichment) : null;
      } catch {
        return null;
      }
    })(),
    enrichedAt: p.enrichedAt ?? null,
    contact: parseJson(p.contact, null),
    contactAt: p.contactAt ?? null,
    solar: parseJson(p.solar, null),
    solarAt: p.solarAt ?? null,
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
  if (!validCoordinate({ lat, lng })) {
    throw new AppError(httpStatus.BAD_REQUEST, "Valid lat/lng required.");
  }
  const status = (body?.status ?? "NH").toString();
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true },
  });
  const now = new Date();
  const pin = await prisma.canvassPin.create({
    data: {
      orgId,
      repId: userId,
      repName: me?.fullName || "Rep",
      lat,
      lng,
      address: (body?.address ?? "").toString(),
      city: (body?.city ?? "").toString(),
      state: (body?.state ?? "").toString(),
      zip: (body?.zip ?? "").toString(),
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
 * Central pin-access rule. New territory pins require explicit assignment.
 * Older radius-seeded pins remain shared only while they are unassigned.
 */
const canAccessPin = async (userId: string, pin: any, membership?: any) => {
  const m = membership ?? (await membershipIn(userId, pin.orgId));
  if (!m) return false;
  if (m.role === "admin") return true;
  const legacyUnassignedSeeded =
    pin.seeded === true &&
    pin.territoryId == null &&
    (pin.assignedRepId == null || pin.assignedRepId.toString().trim() === "");
  return (
    (!pin.seeded && pin.repId === userId) ||
    pin.assignedRepId === userId ||
    legacyUnassignedSeeded
  );
};

/**
 * List pins for an org. Admin → all; reps see their manual pins, assigned
 * territory pins, and legacy unassigned radius-seeded pins.
 */
const listPins = async (userId: string, orgId: string) => {
  const m = await assertMember(userId, orgId);
  const where: any = { orgId };
  if (m.role !== "admin") {
    where.OR = [
      { repId: userId, seeded: false },
      { assignedRepId: userId },
      {
        seeded: true,
        territoryId: null,
        assignedRepId: null,
      },
    ];
  }
  const pins = await prisma.canvassPin.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 8000,
  });
  const permitted = await Promise.all(
    pins.map(async (pin) =>
      (await canAccessPin(userId, pin, m)) ? pin : null,
    ),
  );
  return permitted.filter(Boolean).map(shapePin);
};

/** Update a pin — status change appends history + bumps visitCount. */
const updatePin = async (userId: string, pinId: string, body: any) => {
  if (!pinId || !OID.test(pinId)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Bad pin id.");
  }
  const pin = await prisma.canvassPin.findUnique({ where: { id: pinId } });
  if (!pin) throw new AppError(httpStatus.NOT_FOUND, "Pin not found.");
  if (!(await canAccessPin(userId, pin))) {
    throw new AppError(httpStatus.FORBIDDEN, "Not allowed.");
  }

  const data: any = {};
  if (typeof body?.homeownerName === "string")
    data.homeownerName = body.homeownerName;
  if (typeof body?.contactEmail === "string")
    data.contactEmail = body.contactEmail;
  if (typeof body?.notes === "string") data.notes = body.notes;
  if (typeof body?.phone === "string") data.phone = body.phone;
  if (typeof body?.address === "string") data.address = body.address;

  if (
    typeof body?.stage === "string" &&
    ["lead", "sale", "approved", "installed"].includes(body.stage)
  ) {
    data.stage = body.stage;
  }
  const numField = (key: string) => {
    if (body?.[key] === undefined) return;
    if (body[key] === null || body[key] === "") {
      data[key] = null;
      return;
    }
    const n = Number(body[key]);
    if (Number.isFinite(n)) data[key] = n;
  };
  numField("systemSizeKw");
  numField("leaseRatePerMonth");
  numField("leaseRatePerKwh");

  // Action items — merge the incoming booleans into the stored map.
  if (body?.actionItems && typeof body.actionItems === "object") {
    const cur = parseJson(pin.actionItems, {});
    data.actionItems = JSON.stringify({ ...cur, ...body.actionItems });
  }

  // Append a note to the audit trail.
  if (typeof body?.addNote === "string" && body.addNote.trim()) {
    const actor = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });
    const log = parseJson(pin.notesLog, []);
    log.push({
      repId: userId,
      repName: actor?.fullName || "Rep",
      text: body.addNote.trim(),
      at: new Date().toISOString(),
    });
    data.notesLog = JSON.stringify(log.slice(-200));
  }

  const newStatus = body?.status?.toString();
  if (newStatus && newStatus !== pin.status) {
    const history = parseJson(pin.statusHistory, []);
    const actor = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });
    history.push({
      status: newStatus,
      at: new Date().toISOString(),
      repId: userId,
      repName: actor?.fullName || "Rep",
    });
    data.status = newStatus;
    data.statusHistory = JSON.stringify(history.slice(-100));
    data.visitCount = (pin.visitCount ?? 1) + 1;
    data.lastVisited = new Date();
    // A rep working a shared pre-loaded home claims it (leaderboard credit).
    if (pin.seeded && newStatus !== "NV") {
      data.repId = userId;
      data.repName = actor?.fullName || pin.repName;
    }
    // Auto-advance the funnel when a sale is logged (unless stage set explicitly).
    if (
      ["SALE", "WON", "CS"].includes(newStatus) &&
      (pin.stage ?? "lead") === "lead" &&
      !data.stage
    ) {
      data.stage = "sale";
    }
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
    throw new AppError(httpStatus.BAD_REQUEST, "Bad pin id.");
  }
  const pin = await prisma.canvassPin.findUnique({ where: { id: pinId } });
  if (!pin) throw new AppError(httpStatus.NOT_FOUND, "Pin not found.");

  const m = await membershipIn(userId, pin.orgId);
  if (m?.role !== "admin") {
    throw new AppError(httpStatus.FORBIDDEN, "Only an admin can assign leads.");
  }

  const repId = (body?.repId ?? "").toString().trim();

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
    throw new AppError(httpStatus.BAD_REQUEST, "Bad rep id.");
  }

  // The target must be an active member of the same org.
  const target = await prisma.orgMembership.findFirst({
    where: { orgId: pin.orgId, userId: repId, active: true },
  });
  if (!target) {
    throw new AppError(httpStatus.BAD_REQUEST, "That rep is not on this team.");
  }

  const repUser = await prisma.user.findUnique({
    where: { id: repId },
    select: { fullName: true },
  });
  const repName = repUser?.fullName || "Rep";

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
  if (!(await canAccessPin(userId, pin))) {
    throw new AppError(httpStatus.FORBIDDEN, "Not allowed.");
  }
  await prisma.canvassPin.delete({ where: { id: pinId } });
  return { ok: true };
};

// ── Territories (drawn areas assigned to reps) ──────────────────────────────

const assertAdmin = async (userId: string, orgId: string) => {
  const m = await assertMember(userId, orgId);
  if (m.role !== "admin") {
    throw new AppError(httpStatus.FORBIDDEN, "Only an admin can do that.");
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
    populationState: t.populationState ?? "idle",
    populationCreated: t.populationCreated ?? 0,
    populationSkipped: t.populationSkipped ?? 0,
    populationError: t.populationError ?? null,
    populatedAt: t.populatedAt ?? null,
    createdBy: t.createdBy,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
};

const normPoints = (raw: any): { lat: number; lng: number }[] =>
  (Array.isArray(raw) ? raw : [])
    .map((p: any) => ({ lat: Number(p?.lat), lng: Number(p?.lng) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

const coordinateKey = (lat: number, lng: number) =>
  `${lat.toFixed(6)},${lng.toFixed(6)}`;

const validCoordinate = (point: any) =>
  Number.isFinite(point?.lat) &&
  Number.isFinite(point?.lng) &&
  point.lat >= -90 &&
  point.lat <= 90 &&
  point.lng >= -180 &&
  point.lng <= 180;

const milesBetween = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) => {
  const radians = Math.PI / 180;
  const dLat = (b.lat - a.lat) * radians;
  const dLng = (b.lng - a.lng) * radians;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * radians) *
      Math.cos(b.lat * radians) *
      Math.sin(dLng / 2) ** 2;
  return 3958.7613 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

/** Keep only active org members and derive names from current user records. */
const resolveAssignedReps = async (orgId: string, rawIds: any) => {
  const ids = [
    ...new Set(
      (Array.isArray(rawIds) ? rawIds : [])
        .map((id) => id?.toString().trim())
        .filter((id): id is string => !!id && OID.test(id)),
    ),
  ];
  if (!ids.length) return [] as { id: string; name: string }[];
  const memberships = await prisma.orgMembership.findMany({
    where: { orgId, userId: { in: ids }, active: true },
    select: { userId: true },
  });
  const activeIds = new Set(memberships.map((membership) => membership.userId));
  const users = await prisma.user.findMany({
    where: { id: { in: ids.filter((id) => activeIds.has(id)) } },
    select: { id: true, fullName: true },
  });
  const names = new Map(users.map((user) => [user.id, user.fullName || "Rep"]));
  return ids
    .filter((id) => activeIds.has(id))
    .map((id) => ({ id, name: names.get(id) || "Rep" }));
};

const territoryReps = async (orgId: string, raw: any) => {
  if (raw !== undefined && !Array.isArray(raw)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "assignedRepIds must be an array.",
    );
  }
  const supplied = raw ?? [];
  const normalized = supplied.map(
    (value: any) => value?.toString().trim() ?? "",
  );
  if (normalized.some((value: string) => !value || !OID.test(value))) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Every assigned rep id must be valid.",
    );
  }
  const ids = [...new Set(normalized)];
  if (!ids.length) return { ids: [] as string[], names: [] as string[] };
  const memberships = await prisma.orgMembership.findMany({
    where: { orgId, userId: { in: ids }, active: true },
    select: { userId: true },
  });
  const memberIds = new Set(memberships.map((membership) => membership.userId));
  if (ids.some((id) => !memberIds.has(id))) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Every assigned rep must be an active member of this team.",
    );
  }
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, fullName: true },
  });
  const namesById = new Map(
    users.map((user) => [user.id, user.fullName || "Rep"]),
  );
  return { ids, names: ids.map((id) => namesById.get(id) || "Rep") };
};

/** Draw a territory (admin only). Needs a polygon of >= 3 points. */
const createTerritory = async (userId: string, orgId: string, body: any) => {
  await assertAdmin(userId, orgId);
  const points = normPoints(body?.points);
  if (points.length < 3) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "An area needs at least 3 points.",
    );
  }
  const reps = await territoryReps(orgId, body?.assignedRepIds);

  const t = await prisma.canvassTerritory.create({
    data: {
      orgId,
      name: (body?.name || "Territory").toString().slice(0, 60),
      color: (body?.color || "#F59E0B").toString().slice(0, 16),
      points: JSON.stringify(points),
      assignedRepIds: reps.ids,
      assignedRepNames: reps.names,
      createdBy: userId,
    },
  });
  return shapeTerritory(t);
};

/** Admin → every area; a rep → only areas assigned to them. */
const listTerritories = async (userId: string, orgId: string) => {
  const m = await assertMember(userId, orgId);
  const where: any = { orgId };
  if (m.role !== "admin") where.assignedRepIds = { has: userId };
  const ts = await prisma.canvassTerritory.findMany({
    where,
    orderBy: { updatedAt: "desc" },
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
    throw new AppError(httpStatus.BAD_REQUEST, "Bad territory id.");
  }
  const t = await prisma.canvassTerritory.findUnique({
    where: { id: territoryId },
  });
  if (!t) throw new AppError(httpStatus.NOT_FOUND, "Territory not found.");
  await assertAdmin(userId, t.orgId);

  const data: any = { updatedAt: new Date() };
  let reps: { ids: string[]; names: string[] } | null = null;
  if (typeof body?.name === "string") data.name = body.name.slice(0, 60);
  if (typeof body?.color === "string") data.color = body.color.slice(0, 16);
  if (Array.isArray(body?.points)) {
    const pts = normPoints(body.points);
    if (pts.length >= 3) data.points = JSON.stringify(pts);
  }
  if (body?.assignedRepIds !== undefined) {
    reps = await territoryReps(t.orgId, body.assignedRepIds);
    data.assignedRepIds = reps.ids;
    data.assignedRepNames = reps.names;
  }

  const terminalStates = ["idle", "complete", "failed", "cancelled"];
  const previousState = t.populationState ?? "idle";
  if (!terminalStates.includes(previousState)) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Territory cannot be edited while population is in progress.",
    );
  }
  const claimed = await prisma.canvassTerritory.updateMany({
    where: { id: territoryId, updatedAt: t.updatedAt },
    data: { populationState: "editing", updatedAt: new Date() },
  });
  if (claimed.count === 0) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Territory changed while editing was starting. Please retry.",
    );
  }
  data.populationState = previousState;
  data.updatedAt = new Date();

  try {
    let updated;
    if (reps == null) {
      updated = await prisma.canvassTerritory.update({
        where: { id: territoryId },
        data,
      });
    } else {
      const pins = await prisma.canvassPin.findMany({
        where: { territoryId },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      const pinUpdates = pins.map((pin, index) => {
        const repIndex = reps!.ids.length ? index % reps!.ids.length : -1;
        return prisma.canvassPin.update({
          where: { id: pin.id },
          data: {
            assignedRepId: repIndex >= 0 ? reps!.ids[repIndex] : null,
            assignedRepName: repIndex >= 0 ? reps!.names[repIndex] : null,
          },
        });
      });
      const [territory] = await prisma.$transaction([
        prisma.canvassTerritory.update({
          where: { id: territoryId },
          data,
        }),
        ...pinUpdates,
      ]);
      updated = territory;
    }
    return shapeTerritory(updated);
  } catch (error) {
    await prisma.canvassTerritory.updateMany({
      where: { id: territoryId, populationState: "editing" },
      data: { populationState: previousState },
    });
    throw error;
  }
};

const deleteTerritory = async (userId: string, territoryId: string) => {
  if (!territoryId || !OID.test(territoryId)) return { ok: true };
  const t = await prisma.canvassTerritory.findUnique({
    where: { id: territoryId },
  });
  if (!t) return { ok: true };
  await assertAdmin(userId, t.orgId);
  const terminalStates = ["idle", "complete", "failed", "cancelled"];
  if (!terminalStates.includes(t.populationState ?? "idle")) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Territory cannot be deleted while population is in progress.",
    );
  }
  const claimed = await prisma.canvassTerritory.updateMany({
    where: { id: territoryId, updatedAt: t.updatedAt },
    data: { populationState: "deleting", updatedAt: new Date() },
  });
  if (claimed.count === 0) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Territory changed while deletion was starting. Please retry.",
    );
  }
  try {
    await prisma.$transaction([
      prisma.canvassPin.deleteMany({ where: { territoryId } }),
      prisma.canvassTerritory.delete({ where: { id: territoryId } }),
    ]);
  } catch (error) {
    await prisma.canvassTerritory.updateMany({
      where: { id: territoryId, populationState: "deleting" },
      data: {
        populationState: "failed",
        populationError: "Territory deletion failed. Please retry.",
      },
    });
    throw error;
  }
  return { ok: true };
};

const cancelTerritoryPopulation = async (
  userId: string,
  territoryId: string,
) => {
  if (!territoryId || !OID.test(territoryId)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Bad territory id.");
  }
  const territory = await prisma.canvassTerritory.findUnique({
    where: { id: territoryId },
  });
  if (!territory) {
    throw new AppError(httpStatus.NOT_FOUND, "Territory not found.");
  }
  await assertAdmin(userId, territory.orgId);
  const cancelled = await prisma.canvassTerritory.updateMany({
    where: { id: territoryId, populationState: "running" },
    data: {
      populationState: "cancelled",
      populationError: "Population cancelled by an admin.",
    },
  });
  const latest = await prisma.canvassTerritory.findUnique({
    where: { id: territoryId },
  });
  if (cancelled.count === 0 && latest?.populationState !== "cancelled") {
    throw new AppError(
      httpStatus.CONFLICT,
      "Population can no longer be cancelled.",
    );
  }
  return shapeTerritory(latest);
};

/**
 * Discover address-level doors around a saved polygon, then retain only exact
 * point-in-polygon matches. Existing org addresses are skipped, including pins
 * created by overlapping territories. Property/contact enrichment is never
 * performed here.
 */
const populateTerritory = async (
  userId: string,
  territoryId: string,
  _body: any,
) => {
  if (!territoryId || !OID.test(territoryId)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Bad territory id.");
  }
  const territory = await prisma.canvassTerritory.findUnique({
    where: { id: territoryId },
  });
  if (!territory)
    throw new AppError(httpStatus.NOT_FOUND, "Territory not found.");
  await assertAdmin(userId, territory.orgId);
  const rawPoints = parseJson(territory.points, []);
  const points = normPoints(rawPoints);
  if (
    !Array.isArray(rawPoints) ||
    rawPoints.length !== points.length ||
    points.length < 3 ||
    points.length > 500 ||
    points.some((point) => !validCoordinate(point))
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Territory polygon must contain 3 to 500 valid points.",
    );
  }
  const key = process.env.RENTCAST_API_KEY;
  if (!key) {
    throw new AppError(httpStatus.BAD_REQUEST, "Property-data key not set.");
  }
  const assignedReps = await resolveAssignedReps(
    territory.orgId,
    territory.assignedRepIds,
  );
  const minLat = Math.min(...points.map((point) => point.lat));
  const maxLat = Math.max(...points.map((point) => point.lat));
  const minLng = Math.min(...points.map((point) => point.lng));
  const maxLng = Math.max(...points.map((point) => point.lng));
  const lat = (minLat + maxLat) / 2;
  const lng = (minLng + maxLng) / 2;
  const radius = Math.max(
    ...points.map((point) => milesBetween({ lat, lng }, point)),
  );
  if (radius > 3) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Territory is too large: the property provider supports a maximum 3-mile radius.",
    );
  }
  const terminalStates = ["idle", "complete", "failed", "cancelled"];
  if (!terminalStates.includes(territory.populationState ?? "idle")) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Territory population is already in progress.",
    );
  }
  const started = await prisma.canvassTerritory.updateMany({
    where: { id: territoryId, updatedAt: territory.updatedAt },
    data: {
      populationState: "running",
      populationError: null,
      updatedAt: new Date(),
    },
  });
  if (started.count === 0) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Territory population is already in progress.",
    );
  }

  try {
    const doFetch: any = (globalThis as any).fetch;
    const url =
      `https://api.rentcast.io/v1/properties?latitude=${lat}` +
      `&longitude=${lng}&radius=${Math.max(radius, 0.1)}&limit=500`;
    const response = await doFetch(url, {
      headers: { "X-Api-Key": key, accept: "application/json" },
    });
    if (!response.ok) {
      throw new AppError(
        response.status === 429
          ? httpStatus.TOO_MANY_REQUESTS
          : httpStatus.BAD_GATEWAY,
        response.status === 429
          ? "Property provider limit reached. Retry later."
          : "Property provider unavailable.",
      );
    }
    const payload = await response.json();
    if (!Array.isArray(payload)) {
      throw new AppError(
        httpStatus.BAD_GATEWAY,
        "Property provider returned an invalid response.",
      );
    }
    const homes = payload;
    const truncated = homes.length >= 500;
    const existing = await prisma.canvassPin.findMany({
      where: { orgId: territory.orgId },
      select: {
        address: true,
        city: true,
        state: true,
        zip: true,
        lat: true,
        lng: true,
      },
    });
    const seenAddresses = new Set(
      existing.map((p) => addressKey(p.address, p.city, p.state, p.zip)),
    );
    const seenCoordinates = new Set(
      existing
        .filter((pin) => Number.isFinite(pin.lat) && Number.isFinite(pin.lng))
        .map((pin) => coordinateKey(pin.lat, pin.lng)),
    );
    const creator = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });
    const rows: any[] = [];
    let matched = 0;
    let skipped = 0;
    for (const home of homes) {
      const homeLat = Number(home?.latitude);
      const homeLng = Number(home?.longitude);
      const address = (
        home?.addressLine1 ||
        home?.formattedAddress ||
        ""
      ).toString();
      const city = (home?.city || "").toString();
      const state = (home?.state || "").toString();
      const zip = (home?.zipCode || "").toString();
      if (
        !address.trim() ||
        !validCoordinate({ lat: homeLat, lng: homeLng }) ||
        !inPolygon(homeLat, homeLng, points)
      ) {
        skipped++;
        continue;
      }
      matched++;
      const addressDedupe = addressKey(address, city, state, zip);
      const coordinateDedupe = coordinateKey(homeLat, homeLng);
      if (
        seenAddresses.has(addressDedupe) ||
        seenCoordinates.has(coordinateDedupe)
      ) {
        skipped++;
        continue;
      }
      seenAddresses.add(addressDedupe);
      seenCoordinates.add(coordinateDedupe);
      const repOffset = assignedReps.length
        ? rows.length % assignedReps.length
        : -1;
      rows.push({
        orgId: territory.orgId,
        territoryId,
        repId: userId,
        repName: creator?.fullName || "Team",
        assignedRepId: repOffset >= 0 ? assignedReps[repOffset].id : null,
        assignedRepName: repOffset >= 0 ? assignedReps[repOffset].name : null,
        lat: homeLat,
        lng: homeLng,
        address,
        city,
        state,
        zip,
        status: "NV",
        stage: "lead",
        seeded: true,
        visitCount: 0,
        lastVisited: new Date(),
      });
    }
    const commitClaim = await prisma.canvassTerritory.updateMany({
      where: { id: territoryId, populationState: "running" },
      data: { populationState: "committing" },
    });
    if (commitClaim.count === 0) {
      const latest = await prisma.canvassTerritory.findUnique({
        where: { id: territoryId },
      });
      return {
        territory: shapeTerritory(latest),
        created: 0,
        matched,
        skipped,
        truncated,
      };
    }
    if (rows.length) await prisma.canvassPin.createMany({ data: rows });
    await prisma.canvassTerritory.updateMany({
      where: { id: territoryId, populationState: "committing" },
      data: {
        populationState: "complete",
        populationCreated: { increment: rows.length },
        populationSkipped: { increment: skipped },
        populationError: null,
        populatedAt: new Date(),
      },
    });
    const updated = await prisma.canvassTerritory.findUnique({
      where: { id: territoryId },
    });
    return {
      territory: shapeTerritory(updated),
      created: rows.length,
      matched,
      skipped,
      truncated,
    };
  } catch (error: any) {
    await prisma.canvassTerritory.updateMany({
      where: {
        id: territoryId,
        populationState: { in: ["running", "committing"] },
      },
      data: {
        populationState: "failed",
        populationError: (error?.message || "Population failed.").slice(0, 200),
      },
    });
    throw error;
  }
};

// ── Property enrichment (home + owner details) ──────────────────────────────
// Looks up public property + assessor detail for an address via a data
// provider. The provider key lives in an env var so it can be swapped without
// an app release; when it's unset the app just shows a "not set up" state.

const latestAssessedValue = (rec: any): number | null => {
  const ta = rec?.taxAssessments;
  if (!ta || typeof ta !== "object") return null;
  const years = Object.keys(ta).sort();
  if (!years.length) return null;
  const latest = ta[years[years.length - 1]];
  const v = latest?.value;
  return typeof v === "number" ? v : null;
};

const ownerName = (rec: any): string => {
  const o = rec?.owner;
  if (!o) return "";
  if (Array.isArray(o.names) && o.names.length) return o.names.join(" & ");
  if (typeof o.name === "string") return o.name;
  return "";
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
  const addr = (address || "").trim();
  if (!addr) {
    throw new AppError(httpStatus.BAD_REQUEST, "address required.");
  }
  try {
    const doFetch: any = (globalThis as any).fetch;
    const hdr = {
      headers: { "X-Api-Key": key, accept: "application/json" },
    };
    const enc = encodeURIComponent(addr);
    // Property facts + a market-value estimate (AVM), in parallel.
    const [propResp, avmResp] = await Promise.all([
      doFetch(
        `https://api.rentcast.io/v1/properties?address=${enc}`,
        hdr,
      ).catch(() => null),
      doFetch(`https://api.rentcast.io/v1/avm/value?address=${enc}`, hdr).catch(
        () => null,
      ),
    ]);

    if (!propResp?.ok || !avmResp?.ok) {
      throw new AppError(
        httpStatus.BAD_GATEWAY,
        "Property provider is unavailable. Please retry shortly.",
      );
    }
    const propJson = await propResp.json();
    const rec = Array.isArray(propJson) ? propJson[0] : propJson;
    const avm = await avmResp.json();
    if (!rec && !avm) {
      return { configured: true, found: false, data: null };
    }

    const facts = rec ?? avm?.subjectProperty ?? {};
    const numOrNull = (v: any) => (typeof v === "number" ? v : null);
    return {
      configured: true,
      found: true,
      data: {
        address: facts.formattedAddress ?? addr,
        owner: ownerName(facts),
        ownerOccupied: facts.ownerOccupied ?? null,
        yearBuilt: facts.yearBuilt ?? null,
        squareFootage: facts.squareFootage ?? null,
        lotSize: facts.lotSize ?? null,
        bedrooms: facts.bedrooms ?? null,
        bathrooms: facts.bathrooms ?? null,
        propertyType: facts.propertyType ?? null,
        lastSalePrice: facts.lastSalePrice ?? null,
        lastSaleDate: facts.lastSaleDate ?? null,
        assessedValue: latestAssessedValue(facts),
        estimatedValue: numOrNull(avm?.price),
        estimatedValueLow: numOrNull(avm?.priceRangeLow),
        estimatedValueHigh: numOrNull(avm?.priceRangeHigh),
      },
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      "Property provider is unavailable. Please retry shortly.",
    );
  }
};

/**
 * Enrich a specific pin's address, CACHED on the pin so a given door only ever
 * costs one provider lookup. `estimate` adds the market-value (AVM) call — kept
 * separate so the cheap default is a single property-records call.
 */
const enrichPin = async (userId: string, pinId: string, estimate: boolean) => {
  if (!pinId || !OID.test(pinId)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Bad pin id.");
  }
  const pin = await prisma.canvassPin.findUnique({ where: { id: pinId } });
  if (!pin) throw new AppError(httpStatus.NOT_FOUND, "Pin not found.");
  if (!(await canAccessPin(userId, pin))) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Not allowed to view this household.",
    );
  }

  const key = process.env.RENTCAST_API_KEY;
  if (!key)
    return { configured: false, found: false, data: null, cached: false };

  let cached: any = null;
  try {
    cached = pin.enrichment ? JSON.parse(pin.enrichment) : null;
  } catch {
    cached = null;
  }
  const lookedUp = !!pin.enrichedAt;
  const needProps = !lookedUp; // property facts only fetched the first time
  const needAvm = estimate && (!cached || cached.estimatedValue == null);

  // Fully served from cache — no provider call, no charge.
  if (!needProps && !needAvm) {
    return { configured: true, found: !!cached, data: cached, cached: true };
  }

  const addr = [pin.address, pin.city, pin.state, pin.zip]
    .filter((s) => (s || "").trim())
    .join(", ");
  if (!addr) throw new AppError(httpStatus.BAD_REQUEST, "Pin has no address.");

  const doFetch: any = (globalThis as any).fetch;
  const hdr = { headers: { "X-Api-Key": key, accept: "application/json" } };
  const enc = encodeURIComponent(addr);
  let data: any = cached;

  if (needProps) {
    try {
      const r = await doFetch(
        `https://api.rentcast.io/v1/properties?address=${enc}`,
        hdr,
      );
      if (!r.ok) {
        throw new AppError(
          httpStatus.BAD_GATEWAY,
          "Property provider is unavailable. Please retry shortly.",
        );
      }
      const j = await r.json();
      const rec = Array.isArray(j) ? j[0] : j;
      if (rec) {
        data = {
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
          estimatedValue: cached?.estimatedValue ?? null,
          estimatedValueLow: cached?.estimatedValueLow ?? null,
          estimatedValueHigh: cached?.estimatedValueHigh ?? null,
        };
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        httpStatus.BAD_GATEWAY,
        "Property provider is unavailable. Please retry shortly.",
      );
    }
  }

  if (needAvm) {
    try {
      const r = await doFetch(
        `https://api.rentcast.io/v1/avm/value?address=${enc}`,
        hdr,
      );
      if (!r.ok) {
        throw new AppError(
          httpStatus.BAD_GATEWAY,
          "Property provider is unavailable. Please retry shortly.",
        );
      }
      const avm = await r.json();
      if (avm && typeof avm.price === "number") {
        data = data ?? {
          address: addr,
          owner: "",
          ownerOccupied: null,
          yearBuilt: null,
          squareFootage: null,
          lotSize: null,
          bedrooms: null,
          bathrooms: null,
          propertyType: avm.subjectProperty?.propertyType ?? null,
          lastSalePrice: null,
          lastSaleDate: null,
          assessedValue: null,
          estimatedValue: null,
          estimatedValueLow: null,
          estimatedValueHigh: null,
        };
        data.estimatedValue = avm.price;
        data.estimatedValueLow =
          typeof avm.priceRangeLow === "number" ? avm.priceRangeLow : null;
        data.estimatedValueHigh =
          typeof avm.priceRangeHigh === "number" ? avm.priceRangeHigh : null;
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        httpStatus.BAD_GATEWAY,
        "Property provider is unavailable. Please retry shortly.",
      );
    }
  }

  // Persist — mark enrichedAt either way so we never re-charge for this door.
  await prisma.canvassPin.update({
    where: { id: pinId },
    data: {
      enrichment: data ? JSON.stringify(data) : null,
      enrichedAt: new Date(),
    },
  });

  return { configured: true, found: !!data, data: data ?? null, cached: false };
};

/**
 * Pre-load a pin on every home in an area (SalesRabbit-style territory map).
 * Pulls parcels from the property provider around a point, dedupes against
 * existing pins, and creates shared "Not Visited" prospect pins. Admin only.
 */
const seedArea = async (userId: string, orgId: string, body: any) => {
  const m = await membershipIn(userId, orgId);
  if (m?.role !== "admin") {
    throw new AppError(httpStatus.FORBIDDEN, "Only an admin can load homes.");
  }
  const key = process.env.RENTCAST_API_KEY;
  if (!key) {
    throw new AppError(httpStatus.BAD_REQUEST, "Property-data key not set.");
  }
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new AppError(httpStatus.BAD_REQUEST, "lat/lng required.");
  }
  const radius = Math.min(Math.max(Number(body?.radius) || 0.75, 0.1), 3);

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true },
  });
  const doFetch: any = (globalThis as any).fetch;
  const url = `https://api.rentcast.io/v1/properties?latitude=${lat}&longitude=${lng}&radius=${radius}&limit=500`;
  let homes: any[];
  try {
    const resp = await doFetch(url, {
      headers: { "X-Api-Key": key, accept: "application/json" },
    });
    if (!resp.ok) {
      throw new AppError(
        httpStatus.BAD_GATEWAY,
        "Property provider is unavailable. Please retry shortly.",
      );
    }
    const payload = await resp.json();
    if (!Array.isArray(payload)) {
      throw new AppError(
        httpStatus.BAD_GATEWAY,
        "Property provider returned an invalid response.",
      );
    }
    homes = payload;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      "Property provider is unavailable. Please retry shortly.",
    );
  }
  const truncated = homes.length >= 500;
  if (!homes.length) {
    return { created: 0, matched: 0, skipped: 0, truncated };
  }

  const existing = await prisma.canvassPin.findMany({
    where: { orgId },
    select: {
      address: true,
      city: true,
      state: true,
      zip: true,
      lat: true,
      lng: true,
    },
  });
  const seenAddresses = new Set(
    existing.map((pin) =>
      addressKey(pin.address, pin.city, pin.state, pin.zip),
    ),
  );
  const seenCoordinates = new Set(
    existing
      .filter((pin) => Number.isFinite(pin.lat) && Number.isFinite(pin.lng))
      .map((pin) => coordinateKey(pin.lat, pin.lng)),
  );
  const now = new Date();
  const rows: any[] = [];
  let matched = 0;
  let skipped = 0;
  for (const h of homes) {
    const addr = (h.addressLine1 || h.formattedAddress || "").toString();
    const homeLat = Number(h.latitude);
    const homeLng = Number(h.longitude);
    if (!addr.trim() || !validCoordinate({ lat: homeLat, lng: homeLng })) {
      skipped++;
      continue;
    }
    matched++;
    const city = (h.city ?? "").toString();
    const state = (h.state ?? "").toString();
    const zip = (h.zipCode ?? "").toString();
    const addressDedupe = addressKey(addr, city, state, zip);
    const coordinateDedupe = coordinateKey(homeLat, homeLng);
    if (
      seenAddresses.has(addressDedupe) ||
      seenCoordinates.has(coordinateDedupe)
    ) {
      skipped++;
      continue;
    }
    seenAddresses.add(addressDedupe);
    seenCoordinates.add(coordinateDedupe);
    rows.push({
      orgId,
      repId: userId, // seeding admin; shared visibility comes from `seeded`
      repName: me?.fullName || "Team",
      lat: homeLat,
      lng: homeLng,
      address: addr,
      city,
      state,
      zip,
      status: "NV",
      stage: "lead",
      seeded: true,
      visitCount: 0,
      lastVisited: now,
    });
  }
  if (!rows.length) return { created: 0, matched, skipped, truncated };
  await prisma.canvassPin.createMany({ data: rows });
  return { created: rows.length, matched, skipped, truncated };
};

/**
 * Skip-trace a door for the resident's name + phone + email (DataSkip). Cached
 * on the pin so a given door is only charged once, and the result fills the
 * pin's homeownerName / phone / contactEmail so it shows everywhere.
 */
const contactPin = async (userId: string, pinId: string) => {
  if (!pinId || !OID.test(pinId)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Bad pin id.");
  }
  const pin = await prisma.canvassPin.findUnique({ where: { id: pinId } });
  if (!pin) throw new AppError(httpStatus.NOT_FOUND, "Pin not found.");
  if (!(await canAccessPin(userId, pin))) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Not allowed to view this household.",
    );
  }

  // Served from cache — no provider call, no charge.
  if (pin.contactAt) {
    return {
      configured: true,
      found: !!pin.contact,
      data: parseJson(pin.contact, null),
      cached: true,
    };
  }

  const key = process.env.DATASKIP_API_KEY;
  if (!key) return { configured: false, found: false, data: null };

  const addr = (pin.address || "").trim();
  if (!addr) throw new AppError(httpStatus.BAD_REQUEST, "Pin has no address.");

  let out: any = null;
  try {
    const doFetch: any = (globalThis as any).fetch;
    const resp = await doFetch("https://app.dataskip.io/api/v1/skip-trace", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        address: addr,
        city: pin.city || undefined,
        state: pin.state || undefined,
        zip: pin.zip || undefined,
      }),
    });
    if (resp.ok) {
      const j = await resp.json();
      if (j && j.found) {
        const phones = Array.isArray(j.phones)
          ? j.phones
              .filter((p: any) => p && p.number)
              .map((p: any) => ({
                number: p.number.toString(),
                type: (p.type || "mobile").toString(),
                dnc: p.dnc === true,
              }))
          : [];
        const name =
          j.contact?.fullName ||
          [j.contact?.firstName, j.contact?.lastName]
            .filter(Boolean)
            .join(" ") ||
          "";
        out = {
          name,
          phones,
          emails: Array.isArray(j.emails)
            ? j.emails.map((e: any) => e.toString())
            : [],
        };
      }
    }
  } catch {
    out = null;
  }

  const data: any = {
    contact: out ? JSON.stringify(out) : null,
    contactAt: new Date(),
  };
  // Fill the door's own fields so the name/phone show everywhere.
  if (out) {
    if (!pin.homeownerName && out.name) data.homeownerName = out.name;
    const firstMobile =
      out.phones.find((p: any) => p.type === "mobile") || out.phones[0];
    if (!pin.phone && firstMobile) data.phone = firstMobile.number;
    if (!pin.contactEmail && out.emails.length) {
      data.contactEmail = out.emails[0];
    }
  }
  await prisma.canvassPin.update({ where: { id: pinId }, data });

  return { configured: true, found: !!out, data: out, cached: false };
};

/**
 * Google Solar potential for a door (the "Project Sunroof" data). Cached on the
 * pin so it's one lookup per door, ever. Returns {configured:false} until the
 * GOOGLE_SOLAR_API_KEY is set; found:false when Google has no coverage there.
 */
const solarPin = async (userId: string, pinId: string) => {
  if (!pinId || !OID.test(pinId)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Bad pin id.");
  }
  const pin = await prisma.canvassPin.findUnique({ where: { id: pinId } });
  if (!pin) throw new AppError(httpStatus.NOT_FOUND, "Pin not found.");
  await assertMember(userId, pin.orgId);

  if (pin.solarAt) {
    return {
      configured: true,
      found: !!pin.solar,
      data: parseJson(pin.solar, null),
      cached: true,
    };
  }

  const key = process.env.GOOGLE_SOLAR_API_KEY;
  if (!key) return { configured: false, found: false, data: null };

  let out: any = null;
  try {
    const doFetch: any = (globalThis as any).fetch;
    const url =
      `https://solar.googleapis.com/v1/buildingInsights:findClosest` +
      `?location.latitude=${pin.lat}&location.longitude=${pin.lng}` +
      `&requiredQuality=LOW&key=${key}`;
    const resp = await doFetch(url, { headers: { accept: "application/json" } });
    if (resp.ok) {
      const j = await resp.json();
      const sp = j?.solarPotential;
      if (sp) {
        const sunshine =
          typeof sp.maxSunshineHoursPerYear === "number"
            ? sp.maxSunshineHoursPerYear
            : null;
        const maxPanels =
          typeof sp.maxArrayPanelsCount === "number"
            ? sp.maxArrayPanelsCount
            : null;
        const roofAreaM2 = sp.wholeRoofStats?.areaMeters2 ?? null;
        const configs = Array.isArray(sp.solarPanelConfigs)
          ? sp.solarPanelConfigs
          : [];
        const best = configs.length ? configs[configs.length - 1] : null;
        const yearlyKwh =
          best && typeof best.yearlyEnergyDcKwh === "number"
            ? best.yearlyEnergyDcKwh
            : null;
        // Simple fit tier for pin colouring: good / ok / poor.
        let fit = "poor";
        if ((maxPanels ?? 0) >= 15 && (sunshine ?? 0) >= 1200) fit = "good";
        else if ((maxPanels ?? 0) >= 6 && (sunshine ?? 0) >= 900) fit = "ok";
        out = {
          fit,
          sunshineHours: sunshine,
          maxPanels,
          roofAreaM2,
          yearlyKwh,
          panelCapacityWatts: sp.panelCapacityWatts ?? null,
          imageryQuality: j.imageryQuality ?? null,
        };
      }
    }
  } catch {
    out = null;
  }

  await prisma.canvassPin.update({
    where: { id: pinId },
    data: { solar: out ? JSON.stringify(out) : null, solarAt: new Date() },
  });

  return { configured: true, found: !!out, data: out, cached: false };
};

/**
 * Location sunlight from PVGIS (EU Joint Research Centre) — FREE, no API key,
 * and global coverage (including rural US where Google Solar has gaps). Given a
 * lat/lon it returns peak sun hours, annual irradiance, a 1 kWp production
 * estimate, the optimal tilt and a monthly breakdown. Not cached in the DB:
 * PVGIS is free and per-location values are stable, so the app caches it
 * in-memory by coordinate.
 */
const irradiance = async (userId: string, orgId: string, body: any) => {
  await assertMember(userId, orgId);
  const lat = Number(body?.lat);
  const lon = Number(body?.lon ?? body?.lng);
  if (!isFinite(lat) || !isFinite(lon)) {
    throw new AppError(httpStatus.BAD_REQUEST, "lat and lon are required.");
  }

  try {
    const doFetch: any = (globalThis as any).fetch;
    const url =
      `https://re.jrc.ec.europa.eu/api/v5_2/PVcalc` +
      `?lat=${lat}&lon=${lon}&peakpower=1&loss=14` +
      `&mountingplace=building&optimalangles=1&outputformat=json`;
    const resp = await doFetch(url, { headers: { accept: "application/json" } });
    if (!resp.ok) return { configured: true, found: false, data: null };
    const j = await resp.json();
    const totals = j?.outputs?.totals?.fixed;
    // In-plane (tilted) annual irradiation — what a panel actually receives.
    const annualIrr = totals ? totals["H(i)_y"] : null;
    const annualKwh = totals ? totals["E_y"] : null;
    if (typeof annualIrr !== "number") {
      return { configured: true, found: false, data: null };
    }
    const psh = annualIrr / 365; // peak sun hours / day
    const tilt = j?.inputs?.mounting_system?.fixed?.slope?.value ?? null;
    const monthlyRaw = Array.isArray(j?.outputs?.monthly?.fixed)
      ? j.outputs.monthly.fixed
      : [];
    const monthly = monthlyRaw.map((m: any) => ({
      month: m.month,
      irradiance: typeof m["H(i)_m"] === "number" ? m["H(i)_m"] : 0,
      kwh: typeof m["E_m"] === "number" ? m["E_m"] : 0,
    }));
    let rating = "low";
    if (psh >= 5.5) rating = "excellent";
    else if (psh >= 4.5) rating = "good";
    else if (psh >= 3.8) rating = "fair";
    const score = Math.max(0, Math.min(100, Math.round((psh / 6.5) * 100)));
    return {
      configured: true,
      found: true,
      data: {
        peakSunHours: Math.round(psh * 100) / 100,
        annualIrradiance: Math.round(annualIrr),
        annualKwhPerKw: typeof annualKwh === "number" ? Math.round(annualKwh) : null,
        optimalTilt: typeof tilt === "number" ? tilt : null,
        rating,
        score,
        monthly,
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
  cancelTerritoryPopulation,
  populateTerritory,
  enrichAddress,
  enrichPin,
  seedArea,
  contactPin,
  solarPin,
  irradiance,
};
