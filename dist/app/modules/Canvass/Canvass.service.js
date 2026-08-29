"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanvassServices = exports.setCanvassPrismaForTests = void 0;
const client_1 = require("@prisma/client");
const http_status_1 = __importDefault(require("http-status"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Canvass_logic_1 = require("./Canvass.logic");
let prisma = new client_1.PrismaClient();
const setCanvassPrismaForTests = (client) => {
    if (process.env.NODE_ENV !== "test") {
        throw new Error("The canvass Prisma override is test-only.");
    }
    prisma = client;
};
exports.setCanvassPrismaForTests = setCanvassPrismaForTests;
const OID = /^[a-f0-9]{24}$/i;
/** A user's active membership in an org (or null). */
const membershipIn = (userId, orgId) => prisma.orgMembership.findFirst({ where: { orgId, userId, active: true } });
const assertMember = (userId, orgId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!orgId || !OID.test(orgId)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Bad org id.");
    }
    const m = yield membershipIn(userId, orgId);
    if (!m)
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, "Not a member of this org.");
    // Sales Ranch access gate: until an admin opens it to the team, only admins
    // may use canvassing.
    if (m.role !== "admin") {
        const org = yield prisma.organization.findUnique({
            where: { id: orgId },
            select: { canvassEnabled: true },
        });
        if (!(org === null || org === void 0 ? void 0 : org.canvassEnabled)) {
            throw new AppError_1.default(http_status_1.default.FORBIDDEN, "Sales Ranch isn’t open to the team yet.");
        }
    }
    return m;
});
const parseJson = (s, fallback) => {
    try {
        return s ? JSON.parse(s) : fallback;
    }
    catch (_a) {
        return fallback;
    }
};
const shapePin = (p) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
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
        assignedRepId: (_a = p.assignedRepId) !== null && _a !== void 0 ? _a : null,
        assignedRepName: (_b = p.assignedRepName) !== null && _b !== void 0 ? _b : null,
        territoryId: (_c = p.territoryId) !== null && _c !== void 0 ? _c : null,
        status: p.status,
        stage: (_d = p.stage) !== null && _d !== void 0 ? _d : "lead",
        seeded: (_e = p.seeded) !== null && _e !== void 0 ? _e : false,
        statusHistory: parseJson(p.statusHistory, []),
        homeownerName: p.homeownerName,
        contactEmail: (_f = p.contactEmail) !== null && _f !== void 0 ? _f : null,
        notes: p.notes,
        notesLog: parseJson(p.notesLog, []),
        phone: p.phone,
        actionItems: parseJson(p.actionItems, {}),
        systemSizeKw: (_g = p.systemSizeKw) !== null && _g !== void 0 ? _g : null,
        leaseRatePerMonth: (_h = p.leaseRatePerMonth) !== null && _h !== void 0 ? _h : null,
        leaseRatePerKwh: (_j = p.leaseRatePerKwh) !== null && _j !== void 0 ? _j : null,
        enrichment: (() => {
            try {
                return p.enrichment ? JSON.parse(p.enrichment) : null;
            }
            catch (_a) {
                return null;
            }
        })(),
        enrichedAt: (_k = p.enrichedAt) !== null && _k !== void 0 ? _k : null,
        contact: parseJson(p.contact, null),
        contactAt: (_l = p.contactAt) !== null && _l !== void 0 ? _l : null,
        solar: parseJson(p.solar, null),
        solarAt: (_m = p.solarAt) !== null && _m !== void 0 ? _m : null,
        visitCount: p.visitCount,
        lastVisited: p.lastVisited,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
    };
};
/** Drop a pin. The rep is always the caller; membership is required. */
const createPin = (userId, orgId, body) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    yield assertMember(userId, orgId);
    const lat = Number(body === null || body === void 0 ? void 0 : body.lat);
    const lng = Number(body === null || body === void 0 ? void 0 : body.lng);
    if (!validCoordinate({ lat, lng })) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Valid lat/lng required.");
    }
    const status = ((_a = body === null || body === void 0 ? void 0 : body.status) !== null && _a !== void 0 ? _a : "NH").toString();
    const me = yield prisma.user.findUnique({
        where: { id: userId },
        select: { fullName: true },
    });
    const now = new Date();
    const pin = yield prisma.canvassPin.create({
        data: {
            orgId,
            repId: userId,
            repName: (me === null || me === void 0 ? void 0 : me.fullName) || "Rep",
            lat,
            lng,
            address: ((_b = body === null || body === void 0 ? void 0 : body.address) !== null && _b !== void 0 ? _b : "").toString(),
            city: ((_c = body === null || body === void 0 ? void 0 : body.city) !== null && _c !== void 0 ? _c : "").toString(),
            state: ((_d = body === null || body === void 0 ? void 0 : body.state) !== null && _d !== void 0 ? _d : "").toString(),
            zip: ((_e = body === null || body === void 0 ? void 0 : body.zip) !== null && _e !== void 0 ? _e : "").toString(),
            status,
            statusHistory: JSON.stringify([
                { status, at: now.toISOString(), repId: userId },
            ]),
            homeownerName: (_f = body === null || body === void 0 ? void 0 : body.homeownerName) !== null && _f !== void 0 ? _f : null,
            notes: (_g = body === null || body === void 0 ? void 0 : body.notes) !== null && _g !== void 0 ? _g : null,
            phone: (_h = body === null || body === void 0 ? void 0 : body.phone) !== null && _h !== void 0 ? _h : null,
            visitCount: 1,
            lastVisited: now,
        },
    });
    return shapePin(pin);
});
/**
 * Central pin-access rule. New territory pins require explicit assignment.
 * Older radius-seeded pins remain shared only while they are unassigned.
 */
const canAccessPin = (userId, pin, membership) => __awaiter(void 0, void 0, void 0, function* () {
    const m = membership !== null && membership !== void 0 ? membership : (yield membershipIn(userId, pin.orgId));
    if (!m)
        return false;
    if (m.role === "admin")
        return true;
    const legacyUnassignedSeeded = pin.seeded === true &&
        pin.territoryId == null &&
        (pin.assignedRepId == null || pin.assignedRepId.toString().trim() === "");
    return ((!pin.seeded && pin.repId === userId) ||
        pin.assignedRepId === userId ||
        legacyUnassignedSeeded);
});
/**
 * List pins for an org. Admin → all; reps see their manual pins, assigned
 * territory pins, and legacy unassigned radius-seeded pins.
 */
const listPins = (userId, orgId) => __awaiter(void 0, void 0, void 0, function* () {
    const m = yield assertMember(userId, orgId);
    const where = { orgId };
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
    const pins = yield prisma.canvassPin.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: 8000,
    });
    const permitted = yield Promise.all(pins.map((pin) => __awaiter(void 0, void 0, void 0, function* () { return (yield canAccessPin(userId, pin, m)) ? pin : null; })));
    return permitted.filter(Boolean).map(shapePin);
});
/** Update a pin — status change appends history + bumps visitCount. */
const updatePin = (userId, pinId, body) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    if (!pinId || !OID.test(pinId)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Bad pin id.");
    }
    const pin = yield prisma.canvassPin.findUnique({ where: { id: pinId } });
    if (!pin)
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Pin not found.");
    if (!(yield canAccessPin(userId, pin))) {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, "Not allowed.");
    }
    const data = {};
    if (typeof (body === null || body === void 0 ? void 0 : body.homeownerName) === "string")
        data.homeownerName = body.homeownerName;
    if (typeof (body === null || body === void 0 ? void 0 : body.contactEmail) === "string")
        data.contactEmail = body.contactEmail;
    if (typeof (body === null || body === void 0 ? void 0 : body.notes) === "string")
        data.notes = body.notes;
    if (typeof (body === null || body === void 0 ? void 0 : body.phone) === "string")
        data.phone = body.phone;
    if (typeof (body === null || body === void 0 ? void 0 : body.address) === "string")
        data.address = body.address;
    if (typeof (body === null || body === void 0 ? void 0 : body.stage) === "string" &&
        ["lead", "sale", "approved", "installed"].includes(body.stage)) {
        data.stage = body.stage;
    }
    const numField = (key) => {
        if ((body === null || body === void 0 ? void 0 : body[key]) === undefined)
            return;
        if (body[key] === null || body[key] === "") {
            data[key] = null;
            return;
        }
        const n = Number(body[key]);
        if (Number.isFinite(n))
            data[key] = n;
    };
    numField("systemSizeKw");
    numField("leaseRatePerMonth");
    numField("leaseRatePerKwh");
    // Action items — merge the incoming booleans into the stored map.
    if ((body === null || body === void 0 ? void 0 : body.actionItems) && typeof body.actionItems === "object") {
        const cur = parseJson(pin.actionItems, {});
        data.actionItems = JSON.stringify(Object.assign(Object.assign({}, cur), body.actionItems));
    }
    // Append a note to the audit trail.
    if (typeof (body === null || body === void 0 ? void 0 : body.addNote) === "string" && body.addNote.trim()) {
        const actor = yield prisma.user.findUnique({
            where: { id: userId },
            select: { fullName: true },
        });
        const log = parseJson(pin.notesLog, []);
        log.push({
            repId: userId,
            repName: (actor === null || actor === void 0 ? void 0 : actor.fullName) || "Rep",
            text: body.addNote.trim(),
            at: new Date().toISOString(),
        });
        data.notesLog = JSON.stringify(log.slice(-200));
    }
    const newStatus = (_a = body === null || body === void 0 ? void 0 : body.status) === null || _a === void 0 ? void 0 : _a.toString();
    if (newStatus && newStatus !== pin.status) {
        const history = parseJson(pin.statusHistory, []);
        const actor = yield prisma.user.findUnique({
            where: { id: userId },
            select: { fullName: true },
        });
        history.push({
            status: newStatus,
            at: new Date().toISOString(),
            repId: userId,
            repName: (actor === null || actor === void 0 ? void 0 : actor.fullName) || "Rep",
        });
        data.status = newStatus;
        data.statusHistory = JSON.stringify(history.slice(-100));
        data.visitCount = ((_b = pin.visitCount) !== null && _b !== void 0 ? _b : 1) + 1;
        data.lastVisited = new Date();
        // A rep working a shared pre-loaded home claims it (leaderboard credit).
        if (pin.seeded && newStatus !== "NV") {
            data.repId = userId;
            data.repName = (actor === null || actor === void 0 ? void 0 : actor.fullName) || pin.repName;
        }
        // Auto-advance the funnel when a sale is logged (unless stage set explicitly).
        if (["SALE", "WON", "CS"].includes(newStatus) &&
            ((_c = pin.stage) !== null && _c !== void 0 ? _c : "lead") === "lead" &&
            !data.stage) {
            data.stage = "sale";
        }
    }
    else if ((body === null || body === void 0 ? void 0 : body.revisit) === true) {
        data.visitCount = ((_d = pin.visitCount) !== null && _d !== void 0 ? _d : 1) + 1;
        data.lastVisited = new Date();
    }
    const updated = yield prisma.canvassPin.update({
        where: { id: pinId },
        data,
    });
    return shapePin(updated);
});
/**
 * Assign (or unassign) a pin to a rep — admin only. An empty `repId` clears the
 * assignment. The target must be an active member of the pin's org.
 */
const assignPin = (userId, pinId, body) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (!pinId || !OID.test(pinId)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Bad pin id.");
    }
    const pin = yield prisma.canvassPin.findUnique({ where: { id: pinId } });
    if (!pin)
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Pin not found.");
    const m = yield membershipIn(userId, pin.orgId);
    if ((m === null || m === void 0 ? void 0 : m.role) !== "admin") {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, "Only an admin can assign leads.");
    }
    const repId = ((_a = body === null || body === void 0 ? void 0 : body.repId) !== null && _a !== void 0 ? _a : "").toString().trim();
    // Empty repId → clear the assignment.
    if (!repId) {
        const cleared = yield prisma.canvassPin.update({
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
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Bad rep id.");
    }
    // The target must be an active member of the same org.
    const target = yield prisma.orgMembership.findFirst({
        where: { orgId: pin.orgId, userId: repId, active: true },
    });
    if (!target) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "That rep is not on this team.");
    }
    const repUser = yield prisma.user.findUnique({
        where: { id: repId },
        select: { fullName: true },
    });
    const repName = (repUser === null || repUser === void 0 ? void 0 : repUser.fullName) || "Rep";
    const updated = yield prisma.canvassPin.update({
        where: { id: pinId },
        data: {
            assignedRepId: repId,
            assignedRepName: repName,
            updatedAt: new Date(),
        },
    });
    return shapePin(updated);
});
const deletePin = (userId, pinId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!pinId || !OID.test(pinId))
        return { ok: true };
    const pin = yield prisma.canvassPin.findUnique({ where: { id: pinId } });
    if (!pin)
        return { ok: true };
    if (!(yield canAccessPin(userId, pin))) {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, "Not allowed.");
    }
    yield prisma.canvassPin.delete({ where: { id: pinId } });
    return { ok: true };
});
// ── Territories (drawn areas assigned to reps) ──────────────────────────────
const assertAdmin = (userId, orgId) => __awaiter(void 0, void 0, void 0, function* () {
    const m = yield assertMember(userId, orgId);
    if (m.role !== "admin") {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, "Only an admin can do that.");
    }
    return m;
});
const shapeTerritory = (t) => {
    var _a, _b, _c, _d, _e, _f, _g;
    let points = [];
    try {
        points = t.points ? JSON.parse(t.points) : [];
    }
    catch (_h) {
        points = [];
    }
    return {
        id: t.id,
        orgId: t.orgId,
        name: t.name,
        color: t.color,
        points,
        assignedRepIds: (_a = t.assignedRepIds) !== null && _a !== void 0 ? _a : [],
        assignedRepNames: (_b = t.assignedRepNames) !== null && _b !== void 0 ? _b : [],
        populationState: (_c = t.populationState) !== null && _c !== void 0 ? _c : "idle",
        populationCreated: (_d = t.populationCreated) !== null && _d !== void 0 ? _d : 0,
        populationSkipped: (_e = t.populationSkipped) !== null && _e !== void 0 ? _e : 0,
        populationError: (_f = t.populationError) !== null && _f !== void 0 ? _f : null,
        populatedAt: (_g = t.populatedAt) !== null && _g !== void 0 ? _g : null,
        createdBy: t.createdBy,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
    };
};
const normPoints = (raw) => (Array.isArray(raw) ? raw : [])
    .map((p) => ({ lat: Number(p === null || p === void 0 ? void 0 : p.lat), lng: Number(p === null || p === void 0 ? void 0 : p.lng) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
const coordinateKey = (lat, lng) => `${lat.toFixed(6)},${lng.toFixed(6)}`;
const validCoordinate = (point) => Number.isFinite(point === null || point === void 0 ? void 0 : point.lat) &&
    Number.isFinite(point === null || point === void 0 ? void 0 : point.lng) &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    point.lng >= -180 &&
    point.lng <= 180;
const milesBetween = (a, b) => {
    const radians = Math.PI / 180;
    const dLat = (b.lat - a.lat) * radians;
    const dLng = (b.lng - a.lng) * radians;
    const x = Math.sin(dLat / 2) ** 2 +
        Math.cos(a.lat * radians) *
            Math.cos(b.lat * radians) *
            Math.sin(dLng / 2) ** 2;
    return 3958.7613 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};
/** Keep only active org members and derive names from current user records. */
const resolveAssignedReps = (orgId, rawIds) => __awaiter(void 0, void 0, void 0, function* () {
    const ids = [
        ...new Set((Array.isArray(rawIds) ? rawIds : [])
            .map((id) => id === null || id === void 0 ? void 0 : id.toString().trim())
            .filter((id) => !!id && OID.test(id))),
    ];
    if (!ids.length)
        return [];
    const memberships = yield prisma.orgMembership.findMany({
        where: { orgId, userId: { in: ids }, active: true },
        select: { userId: true },
    });
    const activeIds = new Set(memberships.map((membership) => membership.userId));
    const users = yield prisma.user.findMany({
        where: { id: { in: ids.filter((id) => activeIds.has(id)) } },
        select: { id: true, fullName: true },
    });
    const names = new Map(users.map((user) => [user.id, user.fullName || "Rep"]));
    return ids
        .filter((id) => activeIds.has(id))
        .map((id) => ({ id, name: names.get(id) || "Rep" }));
});
const territoryReps = (orgId, raw) => __awaiter(void 0, void 0, void 0, function* () {
    if (raw !== undefined && !Array.isArray(raw)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "assignedRepIds must be an array.");
    }
    const supplied = raw !== null && raw !== void 0 ? raw : [];
    const normalized = supplied.map((value) => { var _a; return (_a = value === null || value === void 0 ? void 0 : value.toString().trim()) !== null && _a !== void 0 ? _a : ""; });
    if (normalized.some((value) => !value || !OID.test(value))) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Every assigned rep id must be valid.");
    }
    const ids = [...new Set(normalized)];
    if (!ids.length)
        return { ids: [], names: [] };
    const memberships = yield prisma.orgMembership.findMany({
        where: { orgId, userId: { in: ids }, active: true },
        select: { userId: true },
    });
    const memberIds = new Set(memberships.map((membership) => membership.userId));
    if (ids.some((id) => !memberIds.has(id))) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Every assigned rep must be an active member of this team.");
    }
    const users = yield prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, fullName: true },
    });
    const namesById = new Map(users.map((user) => [user.id, user.fullName || "Rep"]));
    return { ids, names: ids.map((id) => namesById.get(id) || "Rep") };
});
/** Draw a territory (admin only). Needs a polygon of >= 3 points. */
const createTerritory = (userId, orgId, body) => __awaiter(void 0, void 0, void 0, function* () {
    yield assertAdmin(userId, orgId);
    const points = normPoints(body === null || body === void 0 ? void 0 : body.points);
    if (points.length < 3) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "An area needs at least 3 points.");
    }
    const reps = yield territoryReps(orgId, body === null || body === void 0 ? void 0 : body.assignedRepIds);
    const t = yield prisma.canvassTerritory.create({
        data: {
            orgId,
            name: ((body === null || body === void 0 ? void 0 : body.name) || "Territory").toString().slice(0, 60),
            color: ((body === null || body === void 0 ? void 0 : body.color) || "#F59E0B").toString().slice(0, 16),
            points: JSON.stringify(points),
            assignedRepIds: reps.ids,
            assignedRepNames: reps.names,
            createdBy: userId,
        },
    });
    return shapeTerritory(t);
});
/** Admin → every area; a rep → only areas assigned to them. */
const listTerritories = (userId, orgId) => __awaiter(void 0, void 0, void 0, function* () {
    const m = yield assertMember(userId, orgId);
    const where = { orgId };
    if (m.role !== "admin")
        where.assignedRepIds = { has: userId };
    const ts = yield prisma.canvassTerritory.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: 500,
    });
    return ts.map(shapeTerritory);
});
/** Rename / recolor / reshape / reassign an area (admin only). */
const updateTerritory = (userId, territoryId, body) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (!territoryId || !OID.test(territoryId)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Bad territory id.");
    }
    const t = yield prisma.canvassTerritory.findUnique({
        where: { id: territoryId },
    });
    if (!t)
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Territory not found.");
    yield assertAdmin(userId, t.orgId);
    const data = { updatedAt: new Date() };
    let reps = null;
    if (typeof (body === null || body === void 0 ? void 0 : body.name) === "string")
        data.name = body.name.slice(0, 60);
    if (typeof (body === null || body === void 0 ? void 0 : body.color) === "string")
        data.color = body.color.slice(0, 16);
    if (Array.isArray(body === null || body === void 0 ? void 0 : body.points)) {
        const pts = normPoints(body.points);
        if (pts.length >= 3)
            data.points = JSON.stringify(pts);
    }
    if ((body === null || body === void 0 ? void 0 : body.assignedRepIds) !== undefined) {
        reps = yield territoryReps(t.orgId, body.assignedRepIds);
        data.assignedRepIds = reps.ids;
        data.assignedRepNames = reps.names;
    }
    const terminalStates = ["idle", "complete", "failed", "cancelled"];
    const previousState = (_a = t.populationState) !== null && _a !== void 0 ? _a : "idle";
    if (!terminalStates.includes(previousState)) {
        throw new AppError_1.default(http_status_1.default.CONFLICT, "Territory cannot be edited while population is in progress.");
    }
    const claimed = yield prisma.canvassTerritory.updateMany({
        where: { id: territoryId, updatedAt: t.updatedAt },
        data: { populationState: "editing", updatedAt: new Date() },
    });
    if (claimed.count === 0) {
        throw new AppError_1.default(http_status_1.default.CONFLICT, "Territory changed while editing was starting. Please retry.");
    }
    data.populationState = previousState;
    data.updatedAt = new Date();
    try {
        let updated;
        if (reps == null) {
            updated = yield prisma.canvassTerritory.update({
                where: { id: territoryId },
                data,
            });
        }
        else {
            const pins = yield prisma.canvassPin.findMany({
                where: { territoryId },
                orderBy: { createdAt: "asc" },
                select: { id: true },
            });
            const pinUpdates = pins.map((pin, index) => {
                const repIndex = reps.ids.length ? index % reps.ids.length : -1;
                return prisma.canvassPin.update({
                    where: { id: pin.id },
                    data: {
                        assignedRepId: repIndex >= 0 ? reps.ids[repIndex] : null,
                        assignedRepName: repIndex >= 0 ? reps.names[repIndex] : null,
                    },
                });
            });
            const [territory] = yield prisma.$transaction([
                prisma.canvassTerritory.update({
                    where: { id: territoryId },
                    data,
                }),
                ...pinUpdates,
            ]);
            updated = territory;
        }
        return shapeTerritory(updated);
    }
    catch (error) {
        yield prisma.canvassTerritory.updateMany({
            where: { id: territoryId, populationState: "editing" },
            data: { populationState: previousState },
        });
        throw error;
    }
});
const deleteTerritory = (userId, territoryId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (!territoryId || !OID.test(territoryId))
        return { ok: true };
    const t = yield prisma.canvassTerritory.findUnique({
        where: { id: territoryId },
    });
    if (!t)
        return { ok: true };
    yield assertAdmin(userId, t.orgId);
    const terminalStates = ["idle", "complete", "failed", "cancelled"];
    if (!terminalStates.includes((_a = t.populationState) !== null && _a !== void 0 ? _a : "idle")) {
        throw new AppError_1.default(http_status_1.default.CONFLICT, "Territory cannot be deleted while population is in progress.");
    }
    const claimed = yield prisma.canvassTerritory.updateMany({
        where: { id: territoryId, updatedAt: t.updatedAt },
        data: { populationState: "deleting", updatedAt: new Date() },
    });
    if (claimed.count === 0) {
        throw new AppError_1.default(http_status_1.default.CONFLICT, "Territory changed while deletion was starting. Please retry.");
    }
    try {
        yield prisma.$transaction([
            prisma.canvassPin.deleteMany({ where: { territoryId } }),
            prisma.canvassTerritory.delete({ where: { id: territoryId } }),
        ]);
    }
    catch (error) {
        yield prisma.canvassTerritory.updateMany({
            where: { id: territoryId, populationState: "deleting" },
            data: {
                populationState: "failed",
                populationError: "Territory deletion failed. Please retry.",
            },
        });
        throw error;
    }
    return { ok: true };
});
const cancelTerritoryPopulation = (userId, territoryId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!territoryId || !OID.test(territoryId)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Bad territory id.");
    }
    const territory = yield prisma.canvassTerritory.findUnique({
        where: { id: territoryId },
    });
    if (!territory) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Territory not found.");
    }
    yield assertAdmin(userId, territory.orgId);
    const cancelled = yield prisma.canvassTerritory.updateMany({
        where: { id: territoryId, populationState: "running" },
        data: {
            populationState: "cancelled",
            populationError: "Population cancelled by an admin.",
        },
    });
    const latest = yield prisma.canvassTerritory.findUnique({
        where: { id: territoryId },
    });
    if (cancelled.count === 0 && (latest === null || latest === void 0 ? void 0 : latest.populationState) !== "cancelled") {
        throw new AppError_1.default(http_status_1.default.CONFLICT, "Population can no longer be cancelled.");
    }
    return shapeTerritory(latest);
});
/**
 * Discover address-level doors around a saved polygon, then retain only exact
 * point-in-polygon matches. Existing org addresses are skipped, including pins
 * created by overlapping territories. Property/contact enrichment is never
 * performed here.
 */
const populateTerritory = (userId, territoryId, _body) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (!territoryId || !OID.test(territoryId)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Bad territory id.");
    }
    const territory = yield prisma.canvassTerritory.findUnique({
        where: { id: territoryId },
    });
    if (!territory)
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Territory not found.");
    yield assertAdmin(userId, territory.orgId);
    const rawPoints = parseJson(territory.points, []);
    const points = normPoints(rawPoints);
    if (!Array.isArray(rawPoints) ||
        rawPoints.length !== points.length ||
        points.length < 3 ||
        points.length > 500 ||
        points.some((point) => !validCoordinate(point))) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Territory polygon must contain 3 to 500 valid points.");
    }
    const key = process.env.RENTCAST_API_KEY;
    if (!key) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Property-data key not set.");
    }
    const assignedReps = yield resolveAssignedReps(territory.orgId, territory.assignedRepIds);
    const minLat = Math.min(...points.map((point) => point.lat));
    const maxLat = Math.max(...points.map((point) => point.lat));
    const minLng = Math.min(...points.map((point) => point.lng));
    const maxLng = Math.max(...points.map((point) => point.lng));
    const lat = (minLat + maxLat) / 2;
    const lng = (minLng + maxLng) / 2;
    const radius = Math.max(...points.map((point) => milesBetween({ lat, lng }, point)));
    if (radius > 3) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Territory is too large: the property provider supports a maximum 3-mile radius.");
    }
    const terminalStates = ["idle", "complete", "failed", "cancelled"];
    if (!terminalStates.includes((_a = territory.populationState) !== null && _a !== void 0 ? _a : "idle")) {
        throw new AppError_1.default(http_status_1.default.CONFLICT, "Territory population is already in progress.");
    }
    const started = yield prisma.canvassTerritory.updateMany({
        where: { id: territoryId, updatedAt: territory.updatedAt },
        data: {
            populationState: "running",
            populationError: null,
            updatedAt: new Date(),
        },
    });
    if (started.count === 0) {
        throw new AppError_1.default(http_status_1.default.CONFLICT, "Territory population is already in progress.");
    }
    try {
        const doFetch = globalThis.fetch;
        const url = `https://api.rentcast.io/v1/properties?latitude=${lat}` +
            `&longitude=${lng}&radius=${Math.max(radius, 0.1)}&limit=500`;
        const response = yield doFetch(url, {
            headers: { "X-Api-Key": key, accept: "application/json" },
        });
        if (!response.ok) {
            throw new AppError_1.default(response.status === 429
                ? http_status_1.default.TOO_MANY_REQUESTS
                : http_status_1.default.BAD_GATEWAY, response.status === 429
                ? "Property provider limit reached. Retry later."
                : "Property provider unavailable.");
        }
        const payload = yield response.json();
        if (!Array.isArray(payload)) {
            throw new AppError_1.default(http_status_1.default.BAD_GATEWAY, "Property provider returned an invalid response.");
        }
        const homes = payload;
        const truncated = homes.length >= 500;
        const existing = yield prisma.canvassPin.findMany({
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
        const seenAddresses = new Set(existing.map((p) => (0, Canvass_logic_1.addressKey)(p.address, p.city, p.state, p.zip)));
        const seenCoordinates = new Set(existing
            .filter((pin) => Number.isFinite(pin.lat) && Number.isFinite(pin.lng))
            .map((pin) => coordinateKey(pin.lat, pin.lng)));
        const creator = yield prisma.user.findUnique({
            where: { id: userId },
            select: { fullName: true },
        });
        const rows = [];
        let matched = 0;
        let skipped = 0;
        for (const home of homes) {
            const homeLat = Number(home === null || home === void 0 ? void 0 : home.latitude);
            const homeLng = Number(home === null || home === void 0 ? void 0 : home.longitude);
            const address = ((home === null || home === void 0 ? void 0 : home.addressLine1) ||
                (home === null || home === void 0 ? void 0 : home.formattedAddress) ||
                "").toString();
            const city = ((home === null || home === void 0 ? void 0 : home.city) || "").toString();
            const state = ((home === null || home === void 0 ? void 0 : home.state) || "").toString();
            const zip = ((home === null || home === void 0 ? void 0 : home.zipCode) || "").toString();
            if (!address.trim() ||
                !validCoordinate({ lat: homeLat, lng: homeLng }) ||
                !(0, Canvass_logic_1.inPolygon)(homeLat, homeLng, points)) {
                skipped++;
                continue;
            }
            matched++;
            const addressDedupe = (0, Canvass_logic_1.addressKey)(address, city, state, zip);
            const coordinateDedupe = coordinateKey(homeLat, homeLng);
            if (seenAddresses.has(addressDedupe) ||
                seenCoordinates.has(coordinateDedupe)) {
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
                repName: (creator === null || creator === void 0 ? void 0 : creator.fullName) || "Team",
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
            const committed = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
                const commitClaim = yield tx.canvassTerritory.updateMany({
                    where: { id: territoryId, populationState: "running" },
                    data: { populationState: "committing" },
                });
                if (commitClaim.count === 0)
                    return false;
                if (rows.length)
                    yield tx.canvassPin.createMany({ data: rows });
                yield tx.canvassTerritory.updateMany({
                    where: { id: territoryId, populationState: "committing" },
                    data: {
                        populationState: "complete",
                        populationCreated: { increment: rows.length },
                        populationSkipped: { increment: skipped },
                        populationError: null,
                        populatedAt: new Date(),
                    },
                });
                return true;
            }));
            if (!committed) {
            const latest = yield prisma.canvassTerritory.findUnique({
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
        const updated = yield prisma.canvassTerritory.findUnique({
            where: { id: territoryId },
        });
        return {
            territory: shapeTerritory(updated),
            created: rows.length,
            matched,
            skipped,
            truncated,
        };
    }
    catch (error) {
        yield prisma.canvassTerritory.updateMany({
            where: {
                id: territoryId,
                populationState: { in: ["running", "committing"] },
            },
            data: {
                populationState: "failed",
                populationError: ((error === null || error === void 0 ? void 0 : error.message) || "Population failed.").slice(0, 200),
            },
        });
        throw error;
    }
});
// ── Property enrichment (home + owner details) ──────────────────────────────
// Looks up public property + assessor detail for an address via a data
// provider. The provider key lives in an env var so it can be swapped without
// an app release; when it's unset the app just shows a "not set up" state.
const latestAssessedValue = (rec) => {
    const ta = rec === null || rec === void 0 ? void 0 : rec.taxAssessments;
    if (!ta || typeof ta !== "object")
        return null;
    const years = Object.keys(ta).sort();
    if (!years.length)
        return null;
    const latest = ta[years[years.length - 1]];
    const v = latest === null || latest === void 0 ? void 0 : latest.value;
    return typeof v === "number" ? v : null;
};
const ownerName = (rec) => {
    const o = rec === null || rec === void 0 ? void 0 : rec.owner;
    if (!o)
        return "";
    if (Array.isArray(o.names) && o.names.length)
        return o.names.join(" & ");
    if (typeof o.name === "string")
        return o.name;
    return "";
};
/** Enrich an address with home + owner detail. Any org member may look up. */
const enrichAddress = (userId, orgId, address) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    yield assertMember(userId, orgId);
    const key = process.env.RENTCAST_API_KEY;
    if (!key) {
        return { configured: false, found: false, data: null };
    }
    const addr = (address || "").trim();
    if (!addr) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "address required.");
    }
    try {
        const doFetch = globalThis.fetch;
        const hdr = {
            headers: { "X-Api-Key": key, accept: "application/json" },
        };
        const enc = encodeURIComponent(addr);
        // Property facts + a market-value estimate (AVM), in parallel.
        const [propResp, avmResp] = yield Promise.all([
            doFetch(`https://api.rentcast.io/v1/properties?address=${enc}`, hdr).catch(() => null),
            doFetch(`https://api.rentcast.io/v1/avm/value?address=${enc}`, hdr).catch(() => null),
        ]);
        if (!(propResp === null || propResp === void 0 ? void 0 : propResp.ok) || !(avmResp === null || avmResp === void 0 ? void 0 : avmResp.ok)) {
            throw new AppError_1.default(http_status_1.default.BAD_GATEWAY, "Property provider is unavailable. Please retry shortly.");
        }
        const propJson = yield propResp.json();
        const rec = Array.isArray(propJson) ? propJson[0] : propJson;
        const avm = yield avmResp.json();
        if (!rec && !avm) {
            return { configured: true, found: false, data: null };
        }
        const facts = (_a = rec !== null && rec !== void 0 ? rec : avm === null || avm === void 0 ? void 0 : avm.subjectProperty) !== null && _a !== void 0 ? _a : {};
        const numOrNull = (v) => (typeof v === "number" ? v : null);
        return {
            configured: true,
            found: true,
            data: {
                address: (_b = facts.formattedAddress) !== null && _b !== void 0 ? _b : addr,
                owner: ownerName(facts),
                ownerOccupied: (_c = facts.ownerOccupied) !== null && _c !== void 0 ? _c : null,
                yearBuilt: (_d = facts.yearBuilt) !== null && _d !== void 0 ? _d : null,
                squareFootage: (_e = facts.squareFootage) !== null && _e !== void 0 ? _e : null,
                lotSize: (_f = facts.lotSize) !== null && _f !== void 0 ? _f : null,
                bedrooms: (_g = facts.bedrooms) !== null && _g !== void 0 ? _g : null,
                bathrooms: (_h = facts.bathrooms) !== null && _h !== void 0 ? _h : null,
                propertyType: (_j = facts.propertyType) !== null && _j !== void 0 ? _j : null,
                lastSalePrice: (_k = facts.lastSalePrice) !== null && _k !== void 0 ? _k : null,
                lastSaleDate: (_l = facts.lastSaleDate) !== null && _l !== void 0 ? _l : null,
                assessedValue: latestAssessedValue(facts),
                estimatedValue: numOrNull(avm === null || avm === void 0 ? void 0 : avm.price),
                estimatedValueLow: numOrNull(avm === null || avm === void 0 ? void 0 : avm.priceRangeLow),
                estimatedValueHigh: numOrNull(avm === null || avm === void 0 ? void 0 : avm.priceRangeHigh),
            },
        };
    }
    catch (error) {
        if (error instanceof AppError_1.default)
            throw error;
        throw new AppError_1.default(http_status_1.default.BAD_GATEWAY, "Property provider is unavailable. Please retry shortly.");
    }
});
/**
 * Enrich a specific pin's address, CACHED on the pin so a given door only ever
 * costs one provider lookup. `estimate` adds the market-value (AVM) call — kept
 * separate so the cheap default is a single property-records call.
 */
const enrichPin = (userId, pinId, estimate) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    if (!pinId || !OID.test(pinId)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Bad pin id.");
    }
    const pin = yield prisma.canvassPin.findUnique({ where: { id: pinId } });
    if (!pin)
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Pin not found.");
    if (!(yield canAccessPin(userId, pin))) {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, "Not allowed to view this household.");
    }
    const key = process.env.RENTCAST_API_KEY;
    if (!key)
        return { configured: false, found: false, data: null, cached: false };
    let cached = null;
    try {
        cached = pin.enrichment ? JSON.parse(pin.enrichment) : null;
    }
    catch (_r) {
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
    if (!addr)
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Pin has no address.");
    const doFetch = globalThis.fetch;
    const hdr = { headers: { "X-Api-Key": key, accept: "application/json" } };
    const enc = encodeURIComponent(addr);
    let data = cached;
    if (needProps) {
        try {
            const r = yield doFetch(`https://api.rentcast.io/v1/properties?address=${enc}`, hdr);
            if (!r.ok) {
                throw new AppError_1.default(http_status_1.default.BAD_GATEWAY, "Property provider is unavailable. Please retry shortly.");
            }
            const j = yield r.json();
            const rec = Array.isArray(j) ? j[0] : j;
            if (rec) {
                data = {
                    address: (_a = rec.formattedAddress) !== null && _a !== void 0 ? _a : addr,
                    owner: ownerName(rec),
                    ownerOccupied: (_b = rec.ownerOccupied) !== null && _b !== void 0 ? _b : null,
                    yearBuilt: (_c = rec.yearBuilt) !== null && _c !== void 0 ? _c : null,
                    squareFootage: (_d = rec.squareFootage) !== null && _d !== void 0 ? _d : null,
                    lotSize: (_e = rec.lotSize) !== null && _e !== void 0 ? _e : null,
                    bedrooms: (_f = rec.bedrooms) !== null && _f !== void 0 ? _f : null,
                    bathrooms: (_g = rec.bathrooms) !== null && _g !== void 0 ? _g : null,
                    propertyType: (_h = rec.propertyType) !== null && _h !== void 0 ? _h : null,
                    lastSalePrice: (_j = rec.lastSalePrice) !== null && _j !== void 0 ? _j : null,
                    lastSaleDate: (_k = rec.lastSaleDate) !== null && _k !== void 0 ? _k : null,
                    assessedValue: latestAssessedValue(rec),
                    estimatedValue: (_l = cached === null || cached === void 0 ? void 0 : cached.estimatedValue) !== null && _l !== void 0 ? _l : null,
                    estimatedValueLow: (_m = cached === null || cached === void 0 ? void 0 : cached.estimatedValueLow) !== null && _m !== void 0 ? _m : null,
                    estimatedValueHigh: (_o = cached === null || cached === void 0 ? void 0 : cached.estimatedValueHigh) !== null && _o !== void 0 ? _o : null,
                };
            }
        }
        catch (error) {
            if (error instanceof AppError_1.default)
                throw error;
            throw new AppError_1.default(http_status_1.default.BAD_GATEWAY, "Property provider is unavailable. Please retry shortly.");
        }
    }
    if (needAvm) {
        try {
            const r = yield doFetch(`https://api.rentcast.io/v1/avm/value?address=${enc}`, hdr);
            if (!r.ok) {
                throw new AppError_1.default(http_status_1.default.BAD_GATEWAY, "Property provider is unavailable. Please retry shortly.");
            }
            const avm = yield r.json();
            if (avm && typeof avm.price === "number") {
                data = data !== null && data !== void 0 ? data : {
                    address: addr,
                    owner: "",
                    ownerOccupied: null,
                    yearBuilt: null,
                    squareFootage: null,
                    lotSize: null,
                    bedrooms: null,
                    bathrooms: null,
                    propertyType: (_q = (_p = avm.subjectProperty) === null || _p === void 0 ? void 0 : _p.propertyType) !== null && _q !== void 0 ? _q : null,
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
        }
        catch (error) {
            if (error instanceof AppError_1.default)
                throw error;
            throw new AppError_1.default(http_status_1.default.BAD_GATEWAY, "Property provider is unavailable. Please retry shortly.");
        }
    }
    // Persist — mark enrichedAt either way so we never re-charge for this door.
    yield prisma.canvassPin.update({
        where: { id: pinId },
        data: {
            enrichment: data ? JSON.stringify(data) : null,
            enrichedAt: new Date(),
        },
    });
    return { configured: true, found: !!data, data: data !== null && data !== void 0 ? data : null, cached: false };
});
/**
 * Pre-load a pin on every home in an area (SalesRabbit-style territory map).
 * Pulls parcels from the property provider around a point, dedupes against
 * existing pins, and creates shared "Not Visited" prospect pins. Admin only.
 */
const seedArea = (userId, orgId, body) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const m = yield membershipIn(userId, orgId);
    if ((m === null || m === void 0 ? void 0 : m.role) !== "admin") {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, "Only an admin can load homes.");
    }
    const key = process.env.RENTCAST_API_KEY;
    if (!key) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Property-data key not set.");
    }
    const lat = Number(body === null || body === void 0 ? void 0 : body.lat);
    const lng = Number(body === null || body === void 0 ? void 0 : body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "lat/lng required.");
    }
    const radius = Math.min(Math.max(Number(body === null || body === void 0 ? void 0 : body.radius) || 0.75, 0.1), 3);
    const me = yield prisma.user.findUnique({
        where: { id: userId },
        select: { fullName: true },
    });
    const doFetch = globalThis.fetch;
    const url = `https://api.rentcast.io/v1/properties?latitude=${lat}&longitude=${lng}&radius=${radius}&limit=500`;
    let homes;
    try {
        const resp = yield doFetch(url, {
            headers: { "X-Api-Key": key, accept: "application/json" },
        });
        if (!resp.ok) {
            throw new AppError_1.default(http_status_1.default.BAD_GATEWAY, "Property provider is unavailable. Please retry shortly.");
        }
        const payload = yield resp.json();
        if (!Array.isArray(payload)) {
            throw new AppError_1.default(http_status_1.default.BAD_GATEWAY, "Property provider returned an invalid response.");
        }
        homes = payload;
    }
    catch (error) {
        if (error instanceof AppError_1.default)
            throw error;
        throw new AppError_1.default(http_status_1.default.BAD_GATEWAY, "Property provider is unavailable. Please retry shortly.");
    }
    const truncated = homes.length >= 500;
    if (!homes.length) {
        return { created: 0, matched: 0, skipped: 0, truncated };
    }
    const existing = yield prisma.canvassPin.findMany({
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
    const seenAddresses = new Set(existing.map((pin) => (0, Canvass_logic_1.addressKey)(pin.address, pin.city, pin.state, pin.zip)));
    const seenCoordinates = new Set(existing
        .filter((pin) => Number.isFinite(pin.lat) && Number.isFinite(pin.lng))
        .map((pin) => coordinateKey(pin.lat, pin.lng)));
    const now = new Date();
    const rows = [];
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
        const city = ((_a = h.city) !== null && _a !== void 0 ? _a : "").toString();
        const state = ((_b = h.state) !== null && _b !== void 0 ? _b : "").toString();
        const zip = ((_c = h.zipCode) !== null && _c !== void 0 ? _c : "").toString();
        const addressDedupe = (0, Canvass_logic_1.addressKey)(addr, city, state, zip);
        const coordinateDedupe = coordinateKey(homeLat, homeLng);
        if (seenAddresses.has(addressDedupe) ||
            seenCoordinates.has(coordinateDedupe)) {
            skipped++;
            continue;
        }
        seenAddresses.add(addressDedupe);
        seenCoordinates.add(coordinateDedupe);
        rows.push({
            orgId,
            repId: userId, // seeding admin; shared visibility comes from `seeded`
            repName: (me === null || me === void 0 ? void 0 : me.fullName) || "Team",
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
    if (!rows.length)
        return { created: 0, matched, skipped, truncated };
    yield prisma.canvassPin.createMany({ data: rows });
    return { created: rows.length, matched, skipped, truncated };
});
/**
 * Skip-trace a door for the resident's name + phone + email (DataSkip). Cached
 * on the pin so a given door is only charged once, and the result fills the
 * pin's homeownerName / phone / contactEmail so it shows everywhere.
 */
const contactPin = (userId, pinId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    if (!pinId || !OID.test(pinId)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Bad pin id.");
    }
    const pin = yield prisma.canvassPin.findUnique({ where: { id: pinId } });
    if (!pin)
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Pin not found.");
    if (!(yield canAccessPin(userId, pin))) {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, "Not allowed to view this household.");
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
    if (!key)
        return { configured: false, found: false, data: null };
    const addr = (pin.address || "").trim();
    if (!addr)
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Pin has no address.");
    let out = null;
    try {
        const doFetch = globalThis.fetch;
        const resp = yield doFetch("https://app.dataskip.io/api/v1/skip-trace", {
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
            const j = yield resp.json();
            if (j && j.found) {
                const phones = Array.isArray(j.phones)
                    ? j.phones
                        .filter((p) => p && p.number)
                        .map((p) => ({
                        number: p.number.toString(),
                        type: (p.type || "mobile").toString(),
                        dnc: p.dnc === true,
                    }))
                    : [];
                const name = ((_a = j.contact) === null || _a === void 0 ? void 0 : _a.fullName) ||
                    [(_b = j.contact) === null || _b === void 0 ? void 0 : _b.firstName, (_c = j.contact) === null || _c === void 0 ? void 0 : _c.lastName]
                        .filter(Boolean)
                        .join(" ") ||
                    "";
                out = {
                    name,
                    phones,
                    emails: Array.isArray(j.emails)
                        ? j.emails.map((e) => e.toString())
                        : [],
                };
            }
        }
    }
    catch (_d) {
        out = null;
    }
    const data = {
        contact: out ? JSON.stringify(out) : null,
        contactAt: new Date(),
    };
    // Fill the door's own fields so the name/phone show everywhere.
    if (out) {
        if (!pin.homeownerName && out.name)
            data.homeownerName = out.name;
        const firstMobile = out.phones.find((p) => p.type === "mobile") || out.phones[0];
        if (!pin.phone && firstMobile)
            data.phone = firstMobile.number;
        if (!pin.contactEmail && out.emails.length) {
            data.contactEmail = out.emails[0];
        }
    }
    yield prisma.canvassPin.update({ where: { id: pinId }, data });
    return { configured: true, found: !!out, data: out, cached: false };
});
/**
 * Google Solar potential for a door (the "Project Sunroof" data). Cached on the
 * pin so it's one lookup per door, ever. Returns {configured:false} until the
 * GOOGLE_SOLAR_API_KEY is set; found:false when Google has no coverage there.
 */
const solarPin = (userId, pinId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    if (!pinId || !OID.test(pinId)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Bad pin id.");
    }
    const pin = yield prisma.canvassPin.findUnique({ where: { id: pinId } });
    if (!pin)
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Pin not found.");
    yield assertMember(userId, pin.orgId);
    if (pin.solarAt) {
        return {
            configured: true,
            found: !!pin.solar,
            data: parseJson(pin.solar, null),
            cached: true,
        };
    }
    const key = process.env.GOOGLE_SOLAR_API_KEY;
    if (!key)
        return { configured: false, found: false, data: null };
    let out = null;
    try {
        const doFetch = globalThis.fetch;
        const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest` +
            `?location.latitude=${pin.lat}&location.longitude=${pin.lng}` +
            `&requiredQuality=LOW&key=${key}`;
        const resp = yield doFetch(url, { headers: { accept: "application/json" } });
        if (resp.ok) {
            const j = yield resp.json();
            const sp = j === null || j === void 0 ? void 0 : j.solarPotential;
            if (sp) {
                const sunshine = typeof sp.maxSunshineHoursPerYear === "number"
                    ? sp.maxSunshineHoursPerYear
                    : null;
                const maxPanels = typeof sp.maxArrayPanelsCount === "number"
                    ? sp.maxArrayPanelsCount
                    : null;
                const roofAreaM2 = (_b = (_a = sp.wholeRoofStats) === null || _a === void 0 ? void 0 : _a.areaMeters2) !== null && _b !== void 0 ? _b : null;
                const configs = Array.isArray(sp.solarPanelConfigs)
                    ? sp.solarPanelConfigs
                    : [];
                const best = configs.length ? configs[configs.length - 1] : null;
                const yearlyKwh = best && typeof best.yearlyEnergyDcKwh === "number"
                    ? best.yearlyEnergyDcKwh
                    : null;
                // Simple fit tier for pin colouring: good / ok / poor.
                let fit = "poor";
                if ((maxPanels !== null && maxPanels !== void 0 ? maxPanels : 0) >= 15 && (sunshine !== null && sunshine !== void 0 ? sunshine : 0) >= 1200)
                    fit = "good";
                else if ((maxPanels !== null && maxPanels !== void 0 ? maxPanels : 0) >= 6 && (sunshine !== null && sunshine !== void 0 ? sunshine : 0) >= 900)
                    fit = "ok";
                out = {
                    fit,
                    sunshineHours: sunshine,
                    maxPanels,
                    roofAreaM2,
                    yearlyKwh,
                    panelCapacityWatts: (_c = sp.panelCapacityWatts) !== null && _c !== void 0 ? _c : null,
                    imageryQuality: (_d = j.imageryQuality) !== null && _d !== void 0 ? _d : null,
                };
            }
        }
    }
    catch (_e) {
        out = null;
    }
    yield prisma.canvassPin.update({
        where: { id: pinId },
        data: { solar: out ? JSON.stringify(out) : null, solarAt: new Date() },
    });
    return { configured: true, found: !!out, data: out, cached: false };
});
exports.CanvassServices = {
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
};
