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
    return m;
});
const shapePin = (p) => {
    var _a, _b;
    let history = [];
    try {
        history = p.statusHistory ? JSON.parse(p.statusHistory) : [];
    }
    catch (_c) {
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
        assignedRepId: (_a = p.assignedRepId) !== null && _a !== void 0 ? _a : null,
        assignedRepName: (_b = p.assignedRepName) !== null && _b !== void 0 ? _b : null,
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
        where.OR = [{ repId: userId }, { assignedRepId: userId }];
    }
    const pins = yield prisma.canvassPin.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: 5000,
    });
    return pins.map(shapePin);
});
const canEdit = (userId, pin) => __awaiter(void 0, void 0, void 0, function* () {
    if (pin.repId === userId)
        return true;
    const m = yield membershipIn(userId, pin.orgId);
    return (m === null || m === void 0 ? void 0 : m.role) === 'admin';
});
/** Update a pin — status change appends history + bumps visitCount. */
const updatePin = (userId, pinId, body) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
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
    if (typeof (body === null || body === void 0 ? void 0 : body.notes) === 'string')
        data.notes = body.notes;
    if (typeof (body === null || body === void 0 ? void 0 : body.phone) === 'string')
        data.phone = body.phone;
    if (typeof (body === null || body === void 0 ? void 0 : body.address) === 'string')
        data.address = body.address;
    const newStatus = (_a = body === null || body === void 0 ? void 0 : body.status) === null || _a === void 0 ? void 0 : _a.toString();
    if (newStatus && newStatus !== pin.status) {
        let history = [];
        try {
            history = pin.statusHistory ? JSON.parse(pin.statusHistory) : [];
        }
        catch (_d) {
            history = [];
        }
        history.push({
            status: newStatus,
            at: new Date().toISOString(),
            repId: userId,
        });
        data.status = newStatus;
        data.statusHistory = JSON.stringify(history.slice(-100));
        data.visitCount = ((_b = pin.visitCount) !== null && _b !== void 0 ? _b : 1) + 1;
        data.lastVisited = new Date();
    }
    else if ((body === null || body === void 0 ? void 0 : body.revisit) === true) {
        data.visitCount = ((_c = pin.visitCount) !== null && _c !== void 0 ? _c : 1) + 1;
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
    var _a, _b;
    let points = [];
    try {
        points = t.points ? JSON.parse(t.points) : [];
    }
    catch (_c) {
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
        createdBy: t.createdBy,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
    };
};
const normPoints = (raw) => (Array.isArray(raw) ? raw : [])
    .map((p) => ({ lat: Number(p === null || p === void 0 ? void 0 : p.lat), lng: Number(p === null || p === void 0 ? void 0 : p.lng) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
/** Draw a territory (admin only). Needs a polygon of >= 3 points. */
const createTerritory = (userId, orgId, body) => __awaiter(void 0, void 0, void 0, function* () {
    yield assertAdmin(userId, orgId);
    const points = normPoints(body === null || body === void 0 ? void 0 : body.points);
    if (points.length < 3) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'An area needs at least 3 points.');
    }
    const repIds = (Array.isArray(body === null || body === void 0 ? void 0 : body.assignedRepIds) ? body.assignedRepIds : [])
        .map((s) => s.toString())
        .filter((s) => OID.test(s));
    const repNames = (Array.isArray(body === null || body === void 0 ? void 0 : body.assignedRepNames)
        ? body.assignedRepNames
        : []).map((s) => s.toString());
    const t = yield prisma.canvassTerritory.create({
        data: {
            orgId,
            name: ((body === null || body === void 0 ? void 0 : body.name) || 'Territory').toString().slice(0, 60),
            color: ((body === null || body === void 0 ? void 0 : body.color) || '#F59E0B').toString().slice(0, 16),
            points: JSON.stringify(points),
            assignedRepIds: repIds,
            assignedRepNames: repNames,
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
        data.assignedRepIds = body.assignedRepIds
            .map((s) => s.toString())
            .filter((s) => OID.test(s));
    }
    if (Array.isArray(body === null || body === void 0 ? void 0 : body.assignedRepNames)) {
        data.assignedRepNames = body.assignedRepNames.map((s) => s.toString());
    }
    const updated = yield prisma.canvassTerritory.update({
        where: { id: territoryId },
        data,
    });
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
    yield prisma.canvassTerritory.delete({ where: { id: territoryId } });
    return { ok: true };
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
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
        const url = `https://api.rentcast.io/v1/properties?address=${encodeURIComponent(addr)}`;
        const resp = yield doFetch(url, {
            headers: { 'X-Api-Key': key, accept: 'application/json' },
        });
        if (!resp.ok) {
            return { configured: true, found: false, data: null };
        }
        const json = yield resp.json();
        const rec = Array.isArray(json) ? json[0] : json;
        if (!rec) {
            return { configured: true, found: false, data: null };
        }
        return {
            configured: true,
            found: true,
            data: {
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
            },
        };
    }
    catch (_l) {
        return { configured: true, found: false, data: null };
    }
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
    enrichAddress,
};
