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
    let history = [];
    try {
        history = p.statusHistory ? JSON.parse(p.statusHistory) : [];
    }
    catch (_a) {
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
/** List pins for an org. Admin → all; rep → only their own (server-enforced). */
const listPins = (userId, orgId) => __awaiter(void 0, void 0, void 0, function* () {
    const m = yield assertMember(userId, orgId);
    const where = { orgId };
    if (m.role !== 'admin')
        where.repId = userId;
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
exports.CanvassServices = {
    createPin,
    listPins,
    updatePin,
    deletePin,
};
