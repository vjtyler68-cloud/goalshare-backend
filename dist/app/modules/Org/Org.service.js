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
    const parse = (s) => {
        if (!s)
            return null;
        try {
            return JSON.parse(s);
        }
        catch (_a) {
            return null;
        }
    };
    const members = memberships.map(m => {
        var _a, _b;
        return ({
            userId: m.userId,
            name: ((_a = byId[m.userId]) === null || _a === void 0 ? void 0 : _a.fullName) || 'Member',
            avatar: ((_b = byId[m.userId]) === null || _b === void 0 ? void 0 : _b.profile) || '',
            role: m.role,
            joinedAt: m.joinedAt,
            summary: parse(m.summaryJson),
            summaryAt: m.summaryAt,
        });
    });
    return {
        org: org ? shapeOrg(org, mine.role) : null,
        members,
        memberCount: members.length,
    };
});
/** Store the current user's whitelist-scoped engagement summary (a JSON map the
 *  app already scoped to the org type). Best-effort — a bad payload is ignored. */
const pushSummary = (userId, body) => __awaiter(void 0, void 0, void 0, function* () {
    const m = yield myActiveMembership(userId);
    if (!m)
        return { ok: false };
    let summaryJson = null;
    const summary = body === null || body === void 0 ? void 0 : body.summary;
    if (summary && typeof summary === 'object') {
        try {
            summaryJson = JSON.stringify(summary);
        }
        catch (_a) {
            summaryJson = null;
        }
    }
    yield prisma.orgMembership.update({
        where: { id: m.id },
        data: { summaryJson, summaryAt: new Date() },
    });
    return { ok: true };
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
// ── Team HQ (org-private posts + goals) ───────────────────────────────────────
// Every read/write is gated on an active membership in that org, so content
// never leaks to other orgs or the public.
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
const shapePost = (p, userId) => {
    var _a, _b;
    return ({
        id: p.id,
        kind: p.kind,
        text: p.text,
        authorId: p.authorId,
        authorName: p.authorName,
        authorAvatar: p.authorAvatar,
        likeCount: ((_a = p.likes) !== null && _a !== void 0 ? _a : []).length,
        likedByMe: ((_b = p.likes) !== null && _b !== void 0 ? _b : []).includes(userId),
        createdAt: p.createdAt,
    });
};
/** The org's Team HQ: announcements, feed, and goals (with computed progress).
 *  Members only. */
const getSpace = (userId, orgId) => __awaiter(void 0, void 0, void 0, function* () {
    yield assertMember(userId, orgId);
    const posts = yield prisma.orgPost.findMany({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
        take: 200,
    });
    const goals = yield prisma.orgGoal.findMany({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
    });
    // Metric-goal progress = sum of members' reported numbers for that key.
    const memberships = yield prisma.orgMembership.findMany({
        where: { orgId, active: true },
    });
    const sumMetric = (key) => {
        let total = 0;
        for (const m of memberships) {
            if (!m.summaryJson)
                continue;
            try {
                const s = JSON.parse(m.summaryJson);
                const v = s === null || s === void 0 ? void 0 : s[key];
                if (typeof v === 'number')
                    total += v;
            }
            catch (_a) {
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
});
/** Create a post. Announcements require admin; feed posts are open to members. */
const createPost = (userId, orgId, body) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const m = yield assertMember(userId, orgId);
    const kind = ((_a = body === null || body === void 0 ? void 0 : body.kind) !== null && _a !== void 0 ? _a : 'feed').toString() === 'announcement'
        ? 'announcement'
        : 'feed';
    if (kind === 'announcement' && m.role !== 'admin') {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, 'Only admins can post announcements.');
    }
    const text = ((_b = body === null || body === void 0 ? void 0 : body.text) !== null && _b !== void 0 ? _b : '').toString().trim();
    if (!text)
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Post cannot be empty.');
    const me = yield prisma.user.findUnique({
        where: { id: userId },
        select: { fullName: true, profile: true },
    });
    const post = yield prisma.orgPost.create({
        data: {
            orgId,
            authorId: userId,
            authorName: (me === null || me === void 0 ? void 0 : me.fullName) || 'Member',
            authorAvatar: (me === null || me === void 0 ? void 0 : me.profile) || '',
            kind,
            text: text.slice(0, 1000),
        },
    });
    return shapePost(post, userId);
});
const toggleLike = (userId, postId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (!postId || !OID.test(postId)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Bad post id.');
    }
    const post = yield prisma.orgPost.findUnique({ where: { id: postId } });
    if (!post)
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'Post not found.');
    yield assertMember(userId, post.orgId);
    const likes = (_a = post.likes) !== null && _a !== void 0 ? _a : [];
    const has = likes.includes(userId);
    const updated = yield prisma.orgPost.update({
        where: { id: postId },
        data: {
            likes: has
                ? { set: likes.filter(x => x !== userId) }
                : { push: userId },
        },
    });
    return shapePost(updated, userId);
});
const deletePost = (userId, postId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!postId || !OID.test(postId))
        return { ok: true };
    const post = yield prisma.orgPost.findUnique({ where: { id: postId } });
    if (!post)
        return { ok: true };
    const m = yield membershipIn(userId, post.orgId);
    const canDelete = post.authorId === userId || (m === null || m === void 0 ? void 0 : m.role) === 'admin';
    if (!canDelete)
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, 'Not allowed.');
    yield prisma.orgPost.delete({ where: { id: postId } });
    return { ok: true };
});
const createGoal = (userId, orgId, body) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const m = yield assertMember(userId, orgId);
    if (m.role !== 'admin') {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, 'Only admins set team goals.');
    }
    const title = ((_a = body === null || body === void 0 ? void 0 : body.title) !== null && _a !== void 0 ? _a : '').toString().trim();
    if (!title)
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Goal needs a title.');
    const target = Number.isFinite(body === null || body === void 0 ? void 0 : body.target) ? Math.max(0, Math.round(body.target)) : 0;
    const metricKey = ((_b = body === null || body === void 0 ? void 0 : body.metricKey) !== null && _b !== void 0 ? _b : 'manual').toString();
    return prisma.orgGoal.create({
        data: { orgId, title: title.slice(0, 120), target, metricKey, createdBy: userId },
    });
});
const bumpGoal = (userId, goalId, body) => __awaiter(void 0, void 0, void 0, function* () {
    if (!goalId || !OID.test(goalId))
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Bad id.');
    const goal = yield prisma.orgGoal.findUnique({ where: { id: goalId } });
    if (!goal)
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'Goal not found.');
    const m = yield membershipIn(userId, goal.orgId);
    if ((m === null || m === void 0 ? void 0 : m.role) !== 'admin')
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, 'Admins only.');
    const delta = Number.isFinite(body === null || body === void 0 ? void 0 : body.delta) ? Math.round(body.delta) : 0;
    const next = Math.max(0, goal.manualProgress + delta);
    return prisma.orgGoal.update({
        where: { id: goalId },
        data: { manualProgress: next },
    });
});
const deleteGoal = (userId, goalId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!goalId || !OID.test(goalId))
        return { ok: true };
    const goal = yield prisma.orgGoal.findUnique({ where: { id: goalId } });
    if (!goal)
        return { ok: true };
    const m = yield membershipIn(userId, goal.orgId);
    if ((m === null || m === void 0 ? void 0 : m.role) !== 'admin')
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, 'Admins only.');
    yield prisma.orgGoal.delete({ where: { id: goalId } });
    return { ok: true };
});
exports.OrgServices = {
    createOrg,
    joinOrg,
    getMine,
    getRoster,
    pushSummary,
    leaveOrg,
    getSpace,
    createPost,
    toggleLike,
    deletePost,
    createGoal,
    bumpGoal,
    deleteGoal,
};
