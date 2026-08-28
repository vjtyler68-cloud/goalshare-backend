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
exports.CanvassServices = void 0;
const client_1 = require("@prisma/client");
const http_status_1 = __importDefault(require("http-status"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Canvass_logic_1 = require("./Canvass.logic");
const prisma = new client_1.PrismaClient();
const OID = /^[a-f0-9]{24}$/i;
/** A user's active membership in an org (or null). */
const membershipIn = (userId, orgId) => prisma.orgMembership.findFirst({ where: { orgId, userId, active: true } });
const assertMember = (userId, orgId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!orgId || !OID.test(orgId)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Bad org id.');
    }
    const m = yield membershipIn(userId, orgId);
    if (!m)
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, 'Not a member of this org.');
    // Sales Ranch access gate: until an admin opens it to the team, only admins
    // may use canvassing.
    if (m.role !== 'admin') {
        const org = yield prisma.organization.findUnique({
            where: { id: orgId },
            select: { canvassEnabled: true },
        });
        if (!(org === null || org === void 0 ? void 0 : org.canvassEnabled)) {
            throw new AppError_1.default(http_status_1.default.FORBIDDEN, 'Sales Ranch isn’t open to the team yet.');
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
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
        stage: (_d = p.stage) !== null && _d !== void 0 ? _d : 'lead',
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
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'lat/lng required.');
    }
    const status = ((_a = body === null || body === void 0 ? void 0 : body.status) !== null && _a !== void 0 ? _a : 'NH').toString();
    const me = yield prisma.user.findUnique({
        where: { id: userId },
        select: { fullName: true },
    });
    const now = new Date();
    const pin = yield prisma.canvassPin.create({
        data: {
            orgId,
            repId: userId,
            repName: (me === null || me === void 0 ? void 0 : me.fullName) || 'Rep',
            lat,
            lng,
            address: ((_b = body === null || body === void 0 ? void 0 : body.address) !== null && _b !== void 0 ? _b : '').toString(),
            city: ((_c = body === null || body === void 0 ? void 0 : body.city) !== null && _c !== void 0 ? _c : '').toString(),
            state: ((_d = body === null || body === void 0 ? void 0 : body.state) !== null && _d !== void 0 ? _d : '').toString(),
            zip: ((_e = body === null || body === void 0 ? void 0 : body.zip) !== null && _e !== void 0 ? _e : '').toString(),
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
 * List pins for an org. Admin → all; a rep → pins they dropped (repId) OR pins
 * the admin assigned to them (assignedRepId). Server-enforced.
 */
const listPins = (userId, orgId) => __awaiter(void 0, void 0, void 0, function* () {
    const m = yield assertMember(userId, orgId);
    const where = { orgId };
    if (m.role !== 'admin') {
        // Least privilege: reps see only their own drops or explicitly assigned
        // doors. Territory population assigns every created door to one of the
        // territory reps; unassigned territory doors remain admin-only.
        where.OR = [
            { repId: userId },
            { assignedRepId: userId },
        ];
    }
    const pins = yield prisma.canvassPin.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: 8000,
    });
    return pins.map(shapePin);
});
const canEdit = (userId, pin) => __awaiter(void 0, void 0, void 0, function* () {
    if (pin.repId === userId || pin.assignedRepId === userId)
        return true;
    const m = yield membershipIn(userId, pin.orgId);
    return (m === null || m === void 0 ? void 0 : m.role) === 'admin';
});
/** Update a pin — status change appends history + bumps visitCount. */
const updatePin = (userId, pinId, body) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    if (!pinId || !OID.test(pinId)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Bad pin id.');
    }
    const pin = yield prisma.canvassPin.findUnique({ where: { id: pinId } });
    if (!pin)
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'Pin not found.');
    if (!(yield canEdit(userId, pin))) {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, 'Not allowed.');
    }
    const data = { updatedAt: new Date() };
    if (typeof (body === null || body === void 0 ? void 0 : body.homeownerName) === 'string')
        data.homeownerName = body.homeownerName;
    if (typeof (body === null || body === void 0 ? void 0 : body.contactEmail) === 'string')
        data.contactEmail = body.contactEmail;
    if (typeof (body === null || body === void 0 ? void 0 : body.notes) === 'string')
        data.notes = body.notes;
    if (typeof (body === null || body === void 0 ? void 0 : body.phone) === 'string')
        data.phone = body.phone;
    if (typeof (body === null || body === void 0 ? void 0 : body.address) === 'string')
        data.address = body.address;
    if (typeof (body === null || body === void 0 ? void 0 : body.stage) === 'string' &&
        ['lead', 'sale', 'approved', 'installed'].includes(body.stage)) {
        data.stage = body.stage;
    }
    const numField = (key) => {
        if ((body === null || body === void 0 ? void 0 : body[key]) === undefined)
            return;
        if (body[key] === null || body[key] === '') {
            data[key] = null;
            return;
        }
        const n = Number(body[key]);
        if (Number.isFinite(n))
            data[key] = n;
    };
    numField('systemSizeKw');
    numField('leaseRatePerMonth');
    numField('leaseRatePerKwh');
    // Action items — merge the incoming booleans into the stored map.
    if ((body === null || body === void 0 ? void 0 : body.actionItems) && typeof body.actionItems === 'object') {
        const cur = parseJson(pin.actionItems, {});
        data.actionItems = JSON.stringify(Object.assign(Object.assign({}, cur), body.actionItems));
    }
    // Append a note to the audit trail.
    if (typeof (body === null || body === void 0 ? void 0 : body.addNote) === 'string' && body.addNote.trim()) {
        const actor = yield prisma.user.findUnique({
            where: { id: userId },
            select: { fullName: true },
        });
        const log = parseJson(pin.notesLog, []);
        log.push({
            repId: userId,
            repName: (actor === null || actor === void 0 ? void 0 : actor.fullName) || 'Rep',
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
            repName: (actor === null || actor === void 0 ? void 0 : actor.fullName) || 'Rep',
        });
        data.status = newStatus;
        data.statusHistory = JSON.stringify(history.slice(-100));
        data.visitCount = ((_b = pin.visitCount) !== null && _b !== void 0 ? _b : 1) + 1;
        data.lastVisited = new Date();
        // A rep working a shared pre-loaded home claims it (leaderboard credit).
        if (pin.seeded && newStatus !== 'NV') {
            data.repId = userId;
            data.repName = (actor === null || actor === void 0 ? void 0 : actor.fullName) || pin.repName;
        }
        // Auto-advance the funnel when a sale is logged (unless stage set explicitly).
        if (['SALE', 'WON', 'CS'].includes(newStatus) &&
            ((_c = pin.stage) !== null && _c !== void 0 ? _c : 'lead') === 'lead' &&
            !data.stage) {
            data.stage = 'sale';
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
    var _a, _b;
    if (!pinId || !OID.test(pinId)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Bad pin id.');
    }
    const pin = yield prisma.canvassPin.findUnique({ where: { id: pinId } });
    if (!pin)
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'Pin not found.');
    const m = yield membershipIn(userId, pin.orgId);
    if ((m === null || m === void 0 ? void 0 : m.role) !== 'admin') {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, 'Only an admin can assign leads.');
    }
    const repId = ((_a = body === null || body === void 0 ? void 0 : body.repId) !== null && _a !== void 0 ? _a : '').toString().trim();
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
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Bad rep id.');
    }
    // The target must be an active member of the same org.
    const target = yield prisma.orgMembership.findFirst({
        where: { orgId: pin.orgId, userId: repId, active: true },
    });
    if (!target) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'That rep is not on this team.');
    }
    const repUser = yield prisma.user.findUnique({
        where: { id: repId },
        select: { fullName: true },
    });
    const repName = ((_b = body === null || body === void 0 ? void 0 : body.repName) !== null && _b !== void 0 ? _b : '').toString().trim() || (repUser === null || repUser === void 0 ? void 0 : repUser.fullName) || 'Rep';
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
    if (!(yield canEdit(userId, pin))) {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, 'Not allowed.');
    }
    yield prisma.canvassPin.delete({ where: { id: pinId } });
    return { ok: true };
});
// ── Territories (drawn areas assigned to reps) ──────────────────────────────
const assertAdmin = (userId, orgId) => __awaiter(void 0, void 0, void 0, function* () {
    const m = yield assertMember(userId, orgId);
    if (m.role !== 'admin') {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, 'Only an admin can do that.');
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
        populationState: (_c = t.populationState) !== null && _c !== void 0 ? _c : 'idle',
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
const territoryReps = (orgId, raw) => __awaiter(void 0, void 0, void 0, function* () {
    const ids = [
        ...new Set((Array.isArray(raw) ? raw : [])
            .map((value) => value.toString())
            .filter((value) => OID.test(value))),
    ];
    if (!ids.length)
        return { ids: [], names: [] };
    const memberships = yield prisma.orgMembership.findMany({
        where: { orgId, userId: { in: ids }, active: true },
        select: { userId: true },
    });
    const memberIds = new Set(memberships.map((membership) => membership.userId));
    if (ids.some((id) => !memberIds.has(id))) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Every assigned rep must be an active member of this team.');
    }
    const users = yield prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, fullName: true },
    });
    const namesById = new Map(users.map((user) => [user.id, user.fullName || 'Rep']));
    return { ids, names: ids.map((id) => namesById.get(id) || 'Rep') };
});
/** Draw a territory (admin only). Needs a polygon of >= 3 points. */
const createTerritory = (userId, orgId, body) => __awaiter(void 0, void 0, void 0, function* () {
    yield assertAdmin(userId, orgId);
    const points = normPoints(body === null || body === void 0 ? void 0 : body.points);
    if (points.length < 3) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'An area needs at least 3 points.');
    }
    const reps = yield territoryReps(orgId, body === null || body === void 0 ? void 0 : body.assignedRepIds);
    const t = yield prisma.canvassTerritory.create({
        data: {
            orgId,
            name: ((body === null || body === void 0 ? void 0 : body.name) || 'Territory').toString().slice(0, 60),
            color: ((body === null || body === void 0 ? void 0 : body.color) || '#F59E0B').toString().slice(0, 16),
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
    if (m.role !== 'admin')
        where.assignedRepIds = { has: userId };
    const ts = yield prisma.canvassTerritory.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: 500,
    });
    return ts.map(shapeTerritory);
});
/** Rename / recolor / reshape / reassign an area (admin only). */
const updateTerritory = (userId, territoryId, body) => __awaiter(void 0, void 0, void 0, function* () {
    if (!territoryId || !OID.test(territoryId)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Bad territory id.');
    }
    const t = yield prisma.canvassTerritory.findUnique({
        where: { id: territoryId },
    });
    if (!t)
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'Territory not found.');
    yield assertAdmin(userId, t.orgId);
    const data = { updatedAt: new Date() };
    let reps = null;
    if (typeof (body === null || body === void 0 ? void 0 : body.name) === 'string')
        data.name = body.name.slice(0, 60);
    if (typeof (body === null || body === void 0 ? void 0 : body.color) === 'string')
        data.color = body.color.slice(0, 16);
    if (Array.isArray(body === null || body === void 0 ? void 0 : body.points)) {
        const pts = normPoints(body.points);
        if (pts.length >= 3)
            data.points = JSON.stringify(pts);
    }
    if (Array.isArray(body === null || body === void 0 ? void 0 : body.assignedRepIds)) {
        reps = yield territoryReps(t.orgId, body.assignedRepIds);
        data.assignedRepIds = reps.ids;
        data.assignedRepNames = reps.names;
    }
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
            orderBy: { createdAt: 'asc' },
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
});
const deleteTerritory = (userId, territoryId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!territoryId || !OID.test(territoryId))
        return { ok: true };
    const t = yield prisma.canvassTerritory.findUnique({
        where: { id: territoryId },
    });
    if (!t)
        return { ok: true };
    yield assertAdmin(userId, t.orgId);
    yield prisma.$transaction([
        prisma.canvassPin.deleteMany({ where: { territoryId } }),
        prisma.canvassTerritory.delete({ where: { id: territoryId } }),
    ]);
    return { ok: true };
});
const cancelTerritoryPopulation = (userId, territoryId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!territoryId || !OID.test(territoryId)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Bad territory id.');
    }
    const territory = yield prisma.canvassTerritory.findUnique({
        where: { id: territoryId },
    });
    if (!territory) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'Territory not found.');
    }
    yield assertAdmin(userId, territory.orgId);
    yield prisma.canvassTerritory.updateMany({
        where: { id: territoryId, populationState: 'running' },
        data: {
            populationState: 'cancelled',
            populationError: 'Population cancelled by an admin.',
        },
    });
    return shapeTerritory(yield prisma.canvassTerritory.findUnique({ where: { id: territoryId } }));
});
/**
 * Discover address-level doors around a saved polygon, then retain only exact
 * point-in-polygon matches. Existing org addresses are skipped, including pins
 * created by overlapping territories. Property/contact enrichment is never
 * performed here.
 */
const populateTerritory = (userId, territoryId, body) => __awaiter(void 0, void 0, void 0, function* () {
    if (!territoryId || !OID.test(territoryId)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Bad territory id.');
    }
    const territory = yield prisma.canvassTerritory.findUnique({
        where: { id: territoryId },
    });
    if (!territory)
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'Territory not found.');
    yield assertAdmin(userId, territory.orgId);
    const points = normPoints(parseJson(territory.points, []));
    if (points.length < 3) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Territory polygon is invalid.');
    }
    const limit = Math.min(Math.max(Number(body === null || body === void 0 ? void 0 : body.limit) || 500, 1), 1000);
    const key = process.env.RENTCAST_API_KEY;
    if (!key) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Property-data key not set.');
    }
    yield prisma.canvassTerritory.update({
        where: { id: territoryId },
        data: { populationState: 'running', populationError: null },
    });
    try {
        const minLat = Math.min(...points.map((p) => p.lat));
        const maxLat = Math.max(...points.map((p) => p.lat));
        const minLng = Math.min(...points.map((p) => p.lng));
        const maxLng = Math.max(...points.map((p) => p.lng));
        const lat = (minLat + maxLat) / 2;
        const lng = (minLng + maxLng) / 2;
        const milesLat = (maxLat - minLat) * 69;
        const milesLng = (maxLng - minLng) * 69 * Math.max(Math.cos((lat * Math.PI) / 180), 0.2);
        const radius = Math.min(Math.max(Math.hypot(milesLat, milesLng) / 2, 0.1), 3);
        const doFetch = globalThis.fetch;
        const url = `https://api.rentcast.io/v1/properties?latitude=${lat}` +
            `&longitude=${lng}&radius=${radius}&limit=${limit}`;
        const response = yield doFetch(url, {
            headers: { 'X-Api-Key': key, accept: 'application/json' },
        });
        if (!response.ok) {
            throw new AppError_1.default(response.status === 429
                ? http_status_1.default.TOO_MANY_REQUESTS
                : http_status_1.default.BAD_GATEWAY, response.status === 429
                ? 'Property provider limit reached. Retry later.'
                : 'Property provider unavailable.');
        }
        const payload = yield response.json();
        const homes = Array.isArray(payload) ? payload : [];
        const existing = yield prisma.canvassPin.findMany({
            where: { orgId: territory.orgId },
            select: { address: true, city: true, state: true, zip: true },
        });
        const seen = new Set(existing.map((p) => (0, Canvass_logic_1.addressKey)(p.address, p.city, p.state, p.zip)));
        const creator = yield prisma.user.findUnique({
            where: { id: userId },
            select: { fullName: true },
        });
        const rows = [];
        let skipped = 0;
        let assignmentIndex = 0;
        for (const home of homes) {
            const homeLat = Number(home === null || home === void 0 ? void 0 : home.latitude);
            const homeLng = Number(home === null || home === void 0 ? void 0 : home.longitude);
            const address = ((home === null || home === void 0 ? void 0 : home.addressLine1) || (home === null || home === void 0 ? void 0 : home.formattedAddress) || '').toString();
            const city = ((home === null || home === void 0 ? void 0 : home.city) || '').toString();
            const state = ((home === null || home === void 0 ? void 0 : home.state) || '').toString();
            const zip = ((home === null || home === void 0 ? void 0 : home.zipCode) || '').toString();
            if (!address ||
                !Number.isFinite(homeLat) ||
                !Number.isFinite(homeLng) ||
                !(0, Canvass_logic_1.inPolygon)(homeLat, homeLng, points)) {
                skipped++;
                continue;
            }
            const dedupe = (0, Canvass_logic_1.addressKey)(address, city, state, zip);
            if (seen.has(dedupe)) {
                skipped++;
                continue;
            }
            seen.add(dedupe);
            const repCount = territory.assignedRepIds.length;
            const repOffset = repCount ? assignmentIndex++ % repCount : -1;
            rows.push({
                orgId: territory.orgId,
                territoryId,
                repId: userId,
                repName: (creator === null || creator === void 0 ? void 0 : creator.fullName) || 'Team',
                assignedRepId: repOffset >= 0 ? territory.assignedRepIds[repOffset] : null,
                assignedRepName: repOffset >= 0 ? territory.assignedRepNames[repOffset] || 'Rep' : null,
                lat: homeLat,
                lng: homeLng,
                address,
                city,
                state,
                zip,
                status: 'NV',
                stage: 'lead',
                seeded: true,
                visitCount: 0,
                lastVisited: new Date(),
            });
        }
        const latest = yield prisma.canvassTerritory.findUnique({
            where: { id: territoryId },
        });
        if ((latest === null || latest === void 0 ? void 0 : latest.populationState) === 'cancelled') {
            return { territory: shapeTerritory(latest), created: 0, skipped };
        }
        if (rows.length)
            yield prisma.canvassPin.createMany({ data: rows });
        const updated = yield prisma.canvassTerritory.update({
            where: { id: territoryId },
            data: {
                populationState: 'complete',
                populationCreated: { increment: rows.length },
                populationSkipped: { increment: skipped },
                populationError: null,
                populatedAt: new Date(),
            },
        });
        return { territory: shapeTerritory(updated), created: rows.length, skipped };
    }
    catch (error) {
        yield prisma.canvassTerritory.update({
            where: { id: territoryId },
            data: {
                populationState: 'failed',
                populationError: ((error === null || error === void 0 ? void 0 : error.message) || 'Population failed.').slice(0, 200),
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
    if (!ta || typeof ta !== 'object')
        return null;
    const years = Object.keys(ta).sort();
    if (!years.length)
        return null;
    const latest = ta[years[years.length - 1]];
    const v = latest === null || latest === void 0 ? void 0 : latest.value;
    return typeof v === 'number' ? v : null;
};
const ownerName = (rec) => {
    const o = rec === null || rec === void 0 ? void 0 : rec.owner;
    if (!o)
        return '';
    if (Array.isArray(o.names) && o.names.length)
        return o.names.join(' & ');
    if (typeof o.name === 'string')
        return o.name;
    return '';
};
/** Enrich an address with home + owner detail. Any org member may look up. */
const enrichAddress = (userId, orgId, address) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    yield assertMember(userId, orgId);
    const key = process.env.RENTCAST_API_KEY;
    if (!key) {
        return { configured: false, found: false, data: null };
    }
    const addr = (address || '').trim();
    if (!addr) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'address required.');
    }
    try {
        const doFetch = globalThis.fetch;
        const hdr = {
            headers: { 'X-Api-Key': key, accept: 'application/json' },
        };
        const enc = encodeURIComponent(addr);
        // Property facts + a market-value estimate (AVM), in parallel.
        const [propResp, avmResp] = yield Promise.all([
            doFetch(`https://api.rentcast.io/v1/properties?address=${enc}`, hdr).catch(() => null),
            doFetch(`https://api.rentcast.io/v1/avm/value?address=${enc}`, hdr).catch(() => null),
        ]);
        let rec = null;
        if (propResp && propResp.ok) {
            const j = yield propResp.json();
            rec = Array.isArray(j) ? j[0] : j;
        }
        let avm = null;
        if (avmResp && avmResp.ok) {
            avm = yield avmResp.json();
        }
        if (!rec && !avm) {
            return { configured: true, found: false, data: null };
        }
        const facts = (_a = rec !== null && rec !== void 0 ? rec : avm === null || avm === void 0 ? void 0 : avm.subjectProperty) !== null && _a !== void 0 ? _a : {};
        const numOrNull = (v) => (typeof v === 'number' ? v : null);
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
    catch (_m) {
        return { configured: true, found: false, data: null };
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
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Bad pin id.');
    }
    const pin = yield prisma.canvassPin.findUnique({ where: { id: pinId } });
    if (!pin)
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'Pin not found.');
    yield assertMember(userId, pin.orgId);
    if (!(yield canEdit(userId, pin))) {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, 'Not allowed to view this household.');
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
        .filter((s) => (s || '').trim())
        .join(', ');
    if (!addr)
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Pin has no address.');
    const doFetch = globalThis.fetch;
    const hdr = { headers: { 'X-Api-Key': key, accept: 'application/json' } };
    const enc = encodeURIComponent(addr);
    let data = cached;
    if (needProps) {
        try {
            const r = yield doFetch(`https://api.rentcast.io/v1/properties?address=${enc}`, hdr);
            if (r.ok) {
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
        }
        catch (_s) {
            /* leave data as-is */
        }
    }
    if (needAvm) {
        try {
            const r = yield doFetch(`https://api.rentcast.io/v1/avm/value?address=${enc}`, hdr);
            if (r.ok) {
                const avm = yield r.json();
                if (avm && typeof avm.price === 'number') {
                    data = data !== null && data !== void 0 ? data : {
                        address: addr,
                        owner: '',
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
                        typeof avm.priceRangeLow === 'number' ? avm.priceRangeLow : null;
                    data.estimatedValueHigh =
                        typeof avm.priceRangeHigh === 'number' ? avm.priceRangeHigh : null;
                }
            }
        }
        catch (_t) {
            /* leave data as-is */
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    const m = yield membershipIn(userId, orgId);
    if ((m === null || m === void 0 ? void 0 : m.role) !== 'admin') {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, 'Only an admin can load homes.');
    }
    const key = process.env.RENTCAST_API_KEY;
    if (!key) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Property-data key not set.');
    }
    const lat = Number(body === null || body === void 0 ? void 0 : body.lat);
    const lng = Number(body === null || body === void 0 ? void 0 : body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'lat/lng required.');
    }
    const radius = Math.min(Math.max(Number(body === null || body === void 0 ? void 0 : body.radius) || 0.75, 0.1), 3);
    const me = yield prisma.user.findUnique({
        where: { id: userId },
        select: { fullName: true },
    });
    const doFetch = globalThis.fetch;
    const url = `https://api.rentcast.io/v1/properties?latitude=${lat}&longitude=${lng}&radius=${radius}&limit=500`;
    let homes = [];
    try {
        const resp = yield doFetch(url, {
            headers: { 'X-Api-Key': key, accept: 'application/json' },
        });
        if (resp.ok) {
            const j = yield resp.json();
            homes = Array.isArray(j) ? j : [];
        }
    }
    catch (_p) {
        homes = [];
    }
    if (!homes.length)
        return { created: 0 };
    const existing = yield prisma.canvassPin.findMany({
        where: { orgId },
        select: { address: true },
    });
    const seen = new Set(existing.map((e) => (e.address || '').toLowerCase().trim()));
    const now = new Date();
    const rows = [];
    for (const h of homes) {
        const addr = (h.addressLine1 || h.formattedAddress || '').toString();
        if (!addr)
            continue;
        const k = addr.toLowerCase().trim();
        if (seen.has(k))
            continue;
        if (typeof h.latitude !== 'number' || typeof h.longitude !== 'number') {
            continue;
        }
        seen.add(k);
        const enrichment = {
            address: (_a = h.formattedAddress) !== null && _a !== void 0 ? _a : addr,
            owner: ownerName(h),
            ownerOccupied: (_b = h.ownerOccupied) !== null && _b !== void 0 ? _b : null,
            yearBuilt: (_c = h.yearBuilt) !== null && _c !== void 0 ? _c : null,
            squareFootage: (_d = h.squareFootage) !== null && _d !== void 0 ? _d : null,
            lotSize: (_e = h.lotSize) !== null && _e !== void 0 ? _e : null,
            bedrooms: (_f = h.bedrooms) !== null && _f !== void 0 ? _f : null,
            bathrooms: (_g = h.bathrooms) !== null && _g !== void 0 ? _g : null,
            propertyType: (_h = h.propertyType) !== null && _h !== void 0 ? _h : null,
            lastSalePrice: (_j = h.lastSalePrice) !== null && _j !== void 0 ? _j : null,
            lastSaleDate: (_k = h.lastSaleDate) !== null && _k !== void 0 ? _k : null,
            assessedValue: latestAssessedValue(h),
            estimatedValue: null,
            estimatedValueLow: null,
            estimatedValueHigh: null,
        };
        rows.push({
            orgId,
            repId: userId, // seeding admin; shared visibility comes from `seeded`
            repName: (me === null || me === void 0 ? void 0 : me.fullName) || 'Team',
            lat: h.latitude,
            lng: h.longitude,
            address: addr,
            city: ((_l = h.city) !== null && _l !== void 0 ? _l : '').toString(),
            state: ((_m = h.state) !== null && _m !== void 0 ? _m : '').toString(),
            zip: ((_o = h.zipCode) !== null && _o !== void 0 ? _o : '').toString(),
            status: 'NV',
            stage: 'lead',
            seeded: true,
            enrichment: JSON.stringify(enrichment),
            enrichedAt: now,
            visitCount: 0,
            lastVisited: now,
        });
    }
    if (!rows.length)
        return { created: 0 };
    yield prisma.canvassPin.createMany({ data: rows });
    return { created: rows.length };
});
/**
 * Skip-trace a door for the resident's name + phone + email (DataSkip). Cached
 * on the pin so a given door is only charged once, and the result fills the
 * pin's homeownerName / phone / contactEmail so it shows everywhere.
 */
const contactPin = (userId, pinId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    if (!pinId || !OID.test(pinId)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Bad pin id.');
    }
    const pin = yield prisma.canvassPin.findUnique({ where: { id: pinId } });
    if (!pin)
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'Pin not found.');
    yield assertMember(userId, pin.orgId);
    if (!(yield canEdit(userId, pin))) {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, 'Not allowed to view this household.');
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
    const addr = (pin.address || '').trim();
    if (!addr)
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Pin has no address.');
    let out = null;
    try {
        const doFetch = globalThis.fetch;
        const resp = yield doFetch('https://app.dataskip.io/api/v1/skip-trace', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${key}`,
                'Content-Type': 'application/json',
                accept: 'application/json',
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
                        type: (p.type || 'mobile').toString(),
                        dnc: p.dnc === true,
                    }))
                    : [];
                const name = ((_a = j.contact) === null || _a === void 0 ? void 0 : _a.fullName) ||
                    [(_b = j.contact) === null || _b === void 0 ? void 0 : _b.firstName, (_c = j.contact) === null || _c === void 0 ? void 0 : _c.lastName]
                        .filter(Boolean)
                        .join(' ') ||
                    '';
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
        const firstMobile = out.phones.find((p) => p.type === 'mobile') || out.phones[0];
        if (!pin.phone && firstMobile)
            data.phone = firstMobile.number;
        if (!pin.contactEmail && out.emails.length) {
            data.contactEmail = out.emails[0];
        }
    }
    yield prisma.canvassPin.update({ where: { id: pinId }, data });
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
};
