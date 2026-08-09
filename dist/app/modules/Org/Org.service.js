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
exports.OrgServices = void 0;
const client_1 = require("@prisma/client");
const http_status_1 = __importDefault(require("http-status"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const prisma = new client_1.PrismaClient();
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
const myActiveMembership = (userId) => prisma.orgMembership.findFirst({ where: { userId, active: true } });
/** Create an org — the creator becomes its admin. One active org per user. */
const createOrg = (userId, body) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const existing = yield myActiveMembership(userId);
    if (existing) {
        throw new AppError_1.default(http_status_1.default.CONFLICT, 'You are already in an organization. Leave it first.');
    }
    const name = ((_a = body === null || body === void 0 ? void 0 : body.name) !== null && _a !== void 0 ? _a : '').toString().trim();
    if (!name)
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Org name is required.');
    const orgType = ((_b = body === null || body === void 0 ? void 0 : body.orgType) !== null && _b !== void 0 ? _b : '').toString();
    if (!VALID_TYPES.includes(orgType)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Invalid org type.');
    }
    // Generate a unique invite code (retry on the rare collision).
    let inviteCode = genCode();
    for (let i = 0; i < 5; i++) {
        const clash = yield prisma.organization.findUnique({ where: { inviteCode } });
        if (!clash)
            break;
        inviteCode = genCode();
    }
    const org = yield prisma.organization.create({
        data: { name, orgType, inviteCode, adminUserId: userId },
    });
    yield prisma.orgMembership.create({
        data: { orgId: org.id, userId, role: 'admin' },
    });
    return { org, role: 'admin' };
});
/** Join an org by invite code — the joiner becomes a member. */
const joinOrg = (userId, body) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const existing = yield myActiveMembership(userId);
    if (existing) {
        throw new AppError_1.default(http_status_1.default.CONFLICT, 'You are already in an organization. Leave it first.');
    }
    const code = ((_a = body === null || body === void 0 ? void 0 : body.inviteCode) !== null && _a !== void 0 ? _a : '').toString().trim().toUpperCase();
    if (code.length !== 6) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Enter a 6-character code.');
    }
    const org = yield prisma.organization.findUnique({
        where: { inviteCode: code },
    });
    if (!org) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'No organization with that code.');
    }
    yield prisma.orgMembership.create({
        data: { orgId: org.id, userId, role: 'member' },
    });
    return { org, role: 'member' };
});
const shapeOrg = (org, role) => ({
    id: org.id,
    name: org.name,
    orgType: org.orgType,
    inviteCode: org.inviteCode,
    adminUserId: org.adminUserId,
    role,
    isAdmin: role === 'admin',
});
/** The current user's active org + their role, or null. */
const getMine = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const m = yield myActiveMembership(userId);
    if (!m)
        return { org: null };
    const org = yield prisma.organization.findUnique({ where: { id: m.orgId } });
    if (!org)
        return { org: null };
    return { org: shapeOrg(org, m.role) };
});
/** Roster for [orgId] — admin only. Members with name/avatar/joined/role. */
const getRoster = (userId, orgId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!orgId || !OID.test(orgId)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Bad org id.');
    }
    const mine = yield prisma.orgMembership.findFirst({
        where: { orgId, userId, active: true },
    });
    if (!mine || mine.role !== 'admin') {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, 'Admins only.');
    }
    const org = yield prisma.organization.findUnique({ where: { id: orgId } });
    const memberships = yield prisma.orgMembership.findMany({
        where: { orgId, active: true },
        orderBy: { joinedAt: 'asc' },
    });
    const ids = memberships.map(m => m.userId);
    const users = yield prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, fullName: true, profile: true },
    });
    const byId = {};
    for (const u of users)
        byId[u.id] = u;
    const members = memberships.map(m => {
        var _a, _b;
        return ({
            userId: m.userId,
            name: ((_a = byId[m.userId]) === null || _a === void 0 ? void 0 : _a.fullName) || 'Member',
            avatar: ((_b = byId[m.userId]) === null || _b === void 0 ? void 0 : _b.profile) || '',
            role: m.role,
            joinedAt: m.joinedAt,
        });
    });
    return {
        org: org ? shapeOrg(org, mine.role) : null,
        members,
        memberCount: members.length,
    };
});
/** Leave the current org — soft-delete the membership (kept for records). */
const leaveOrg = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const m = yield myActiveMembership(userId);
    if (!m)
        return { ok: true };
    yield prisma.orgMembership.update({
        where: { id: m.id },
        data: { active: false },
    });
    return { ok: true };
});
exports.OrgServices = {
    createOrg,
    joinOrg,
    getMine,
    getRoster,
    leaveOrg,
};
