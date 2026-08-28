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
// Owner accounts may belong to MULTIPLE orgs (everyone else is one-org).
// Configurable via OWNER_EMAILS (comma-separated); defaults to the app owner.
const OWNER_EMAILS = (process.env.OWNER_EMAILS || 'vjtyler68@gmail.com')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
const isOwner = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const u = yield prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
    });
    return !!u && OWNER_EMAILS.includes((u.email || '').toLowerCase());
});
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
/** May this user belong to MORE than one org at once? True for the owner
 *  allowlist AND for anyone who already ADMINS an org — so an org creator can
 *  spin up additional organizations (multi-site, demos for schools/churches/
 *  companies) without ever leaving their current one. Reliable: it keys off
 *  real admin membership, not just an email match. */
const canHoldMultiple = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    if (yield isOwner(userId))
        return true;
    const adminOf = yield prisma.orgMembership.findFirst({
        where: { userId, role: 'admin', active: true },
    });
    return !!adminOf;
});
/** Create an org — the creator becomes its admin. One active org per user. */
const createOrg = (userId, body) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const existing = yield myActiveMembership(userId);
    if (existing && !(yield canHoldMultiple(userId))) {
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
    if (existing && !(yield canHoldMultiple(userId))) {
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
    // Even an owner can't join the same org twice.
    const already = yield prisma.orgMembership.findFirst({
        where: { orgId: org.id, userId, active: true },
    });
    if (already) {
        throw new AppError_1.default(http_status_1.default.CONFLICT, 'You are already in this org.');
    }
    yield prisma.orgMembership.create({
        data: { orgId: org.id, userId, role: 'member' },
    });
    return { org, role: 'member' };
});
const shapeOrg = (org, role) => {
    var _a, _b, _c, _d, _e, _f;
    return ({
        id: org.id,
        name: org.name,
        orgType: org.orgType,
        inviteCode: org.inviteCode,
        adminUserId: org.adminUserId,
        mapUrl: (_a = org.mapUrl) !== null && _a !== void 0 ? _a : null,
        mapLabel: (_b = org.mapLabel) !== null && _b !== void 0 ? _b : null,
        bookingUrl: (_c = org.bookingUrl) !== null && _c !== void 0 ? _c : null,
        bookingLabel: (_d = org.bookingLabel) !== null && _d !== void 0 ? _d : null,
        taskHubEnabled: (_e = org.taskHubEnabled) !== null && _e !== void 0 ? _e : false,
        // Sales Ranch (canvassing) team access. false = admins only.
        canvassEnabled: (_f = org.canvassEnabled) !== null && _f !== void 0 ? _f : false,
        role,
        isAdmin: role === 'admin',
    });
};
/** The current user's active org + their role, or null. */
const getMine = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const owner = yield isOwner(userId);
    const m = yield myActiveMembership(userId);
    if (!m)
        return { org: null, isOwner: owner };
    const org = yield prisma.organization.findUnique({ where: { id: m.orgId } });
    if (!org)
        return { org: null, isOwner: owner };
    return { org: shapeOrg(org, m.role), isOwner: owner };
});
/** ALL of the user's active orgs (owners can have several) + the owner flag. */
const getMyOrgs = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const owner = yield isOwner(userId);
    const memberships = yield prisma.orgMembership.findMany({
        where: { userId, active: true },
        orderBy: { joinedAt: 'asc' },
    });
    const orgs = [];
    for (const m of memberships) {
        const org = yield prisma.organization.findUnique({ where: { id: m.orgId } });
        if (org)
            orgs.push(shapeOrg(org, m.role));
    }
    return { orgs, isOwner: owner };
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
/** Leave an org — soft-delete the membership (kept for records). With a
 *  specific orgId (owners have several) leaves that one; otherwise the active
 *  membership. */
const leaveOrg = (userId, body) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const orgId = ((_a = body === null || body === void 0 ? void 0 : body.orgId) !== null && _a !== void 0 ? _a : '').toString();
    const m = orgId && OID.test(orgId)
        ? yield prisma.orgMembership.findFirst({
            where: { orgId, userId, active: true },
        })
        : yield myActiveMembership(userId);
    if (!m)
        return { ok: true };
    yield prisma.orgMembership.update({
        where: { id: m.id },
        data: { active: false },
    });
    return { ok: true };
});
/** Set (or clear) the org's Territory Map link. Admin only. An empty mapUrl
 *  removes the map. The link must carry a URI scheme (https:// or an app link). */
const setMap = (userId, orgId, body) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    if (!orgId || !OID.test(orgId)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Bad org id.');
    }
    const mine = yield prisma.orgMembership.findFirst({
        where: { orgId, userId, active: true },
    });
    if (!mine || mine.role !== 'admin') {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, 'Admins only.');
    }
    const raw = ((_a = body === null || body === void 0 ? void 0 : body.mapUrl) !== null && _a !== void 0 ? _a : '').toString().trim();
    let mapUrl = null;
    if (raw) {
        // Require a scheme (https://…, or an app deep link like fieldmaps://…).
        if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) {
            throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Enter a valid map link (it should start with https:// or an app link).');
        }
        mapUrl = raw.slice(0, 2000);
    }
    const label = ((_b = body === null || body === void 0 ? void 0 : body.mapLabel) !== null && _b !== void 0 ? _b : '').toString().trim();
    const mapLabel = label ? label.slice(0, 60) : null;
    const org = yield prisma.organization.update({
        where: { id: orgId },
        data: { mapUrl, mapLabel },
    });
    return { org: shapeOrg(org, mine.role) };
});
/** Set (or clear) the org's appointment scheduler (a booking widget URL). Admin
 *  only. An empty bookingUrl removes it. Must be an http(s) link. */
const setBooking = (userId, orgId, body) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    if (!orgId || !OID.test(orgId)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Bad org id.');
    }
    const mine = yield prisma.orgMembership.findFirst({
        where: { orgId, userId, active: true },
    });
    if (!mine || mine.role !== 'admin') {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, 'Admins only.');
    }
    const raw = ((_a = body === null || body === void 0 ? void 0 : body.bookingUrl) !== null && _a !== void 0 ? _a : '').toString().trim();
    let bookingUrl = null;
    if (raw) {
        // A booking widget is loaded in a web view, so require http(s).
        if (!/^https?:\/\//i.test(raw)) {
            throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Enter a valid scheduler link (it should start with https://).');
        }
        bookingUrl = raw.slice(0, 2000);
    }
    const label = ((_b = body === null || body === void 0 ? void 0 : body.bookingLabel) !== null && _b !== void 0 ? _b : '').toString().trim();
    const bookingLabel = label ? label.slice(0, 60) : null;
    const org = yield prisma.organization.update({
        where: { id: orgId },
        data: { bookingUrl, bookingLabel },
    });
    return { org: shapeOrg(org, mine.role) };
});
/** Turn the shared Task Hub on/off for an org. Admin only. */
const setTaskHub = (userId, orgId, body) => __awaiter(void 0, void 0, void 0, function* () {
    if (!orgId || !OID.test(orgId)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Bad org id.');
    }
    const mine = yield prisma.orgMembership.findFirst({
        where: { orgId, userId, active: true },
    });
    if (!mine || mine.role !== 'admin') {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, 'Admins only.');
    }
    const org = yield prisma.organization.update({
        where: { id: orgId },
        data: { taskHubEnabled: (body === null || body === void 0 ? void 0 : body.enabled) === true },
    });
    return { org: shapeOrg(org, mine.role) };
});
/** Open/close Sales Ranch (canvassing) to the whole team. Admin only; when
 *  off, only admins can use it. */
const setCanvass = (userId, orgId, body) => __awaiter(void 0, void 0, void 0, function* () {
    if (!orgId || !OID.test(orgId)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Bad org id.');
    }
    const mine = yield prisma.orgMembership.findFirst({
        where: { orgId, userId, active: true },
    });
    if (!mine || mine.role !== 'admin') {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, 'Admins only.');
    }
    const org = yield prisma.organization.update({
        where: { id: orgId },
        data: { canvassEnabled: (body === null || body === void 0 ? void 0 : body.enabled) === true },
    });
    return { org: shapeOrg(org, mine.role) };
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
/** Promote a member to admin (co-admin) or demote an admin back to member.
 *  Admin only. The org's FOUNDING admin (adminUserId) can never be demoted, so
 *  an org always keeps at least one admin. Membership.role is the source of
 *  truth; the org's additionalAdminIds array is kept in sync alongside it. */
const setMemberRole = (userId, orgId, body) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    if (!orgId || !OID.test(orgId)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Bad org id.');
    }
    const mine = yield prisma.orgMembership.findFirst({
        where: { orgId, userId, active: true },
    });
    if (!mine || mine.role !== 'admin') {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, 'Admins only.');
    }
    const targetId = ((_a = body === null || body === void 0 ? void 0 : body.userId) !== null && _a !== void 0 ? _a : '').toString();
    if (!targetId || !OID.test(targetId)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Bad member id.');
    }
    const role = ((_b = body === null || body === void 0 ? void 0 : body.role) !== null && _b !== void 0 ? _b : '').toString();
    if (role !== 'admin' && role !== 'member') {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Role must be admin or member.');
    }
    const org = yield prisma.organization.findUnique({ where: { id: orgId } });
    if (!org)
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'Org not found.');
    // The founder is always an admin — blocking their demotion prevents an org
    // from ever being left with no admin.
    if (role === 'member' && targetId === org.adminUserId) {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, 'The organization owner always stays an admin.');
    }
    const target = yield prisma.orgMembership.findFirst({
        where: { orgId, userId: targetId, active: true },
    });
    if (!target) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'That member is not in this org.');
    }
    yield prisma.orgMembership.update({
        where: { id: target.id },
        data: { role },
    });
    // Keep the org's co-admin list accurate for anything that reads it.
    const set = new Set((_c = org.additionalAdminIds) !== null && _c !== void 0 ? _c : []);
    if (role === 'admin') {
        set.add(targetId);
    }
    else {
        set.delete(targetId);
    }
    yield prisma.organization.update({
        where: { id: orgId },
        data: { additionalAdminIds: Array.from(set) },
    });
    return { ok: true, userId: targetId, role };
});
// ── Task Hub (org-private tasks + projects) ───────────────────────────────────
// Shared, assignable tasks for the org's capture → organize → prioritize →
// schedule → assign → follow-up → review → report workflow. Every read/write is
// gated on membership in that org (assertMember), so tasks never leak.
const TASK_STATUS = ['todo', 'in_progress', 'waiting', 'approval', 'done'];
const TASK_PRIORITY = ['low', 'medium', 'high', 'urgent'];
const RECUR = ['none', 'daily', 'weekly', 'monthly', 'quarterly'];
const oidOrNull = (v) => {
    const s = (v !== null && v !== void 0 ? v : '').toString();
    return OID.test(s) ? s : null;
};
// undefined = field not provided (leave unchanged); null = explicit clear.
const parseDate = (v) => {
    if (v === undefined)
        return undefined;
    if (v === null || v === '')
        return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d;
};
const nextDue = (from, rule) => {
    const d = new Date(from);
    switch (rule) {
        case 'daily':
            d.setDate(d.getDate() + 1);
            break;
        case 'weekly':
            d.setDate(d.getDate() + 7);
            break;
        case 'monthly':
            d.setMonth(d.getMonth() + 1);
            break;
        case 'quarterly':
            d.setMonth(d.getMonth() + 3);
            break;
    }
    return d;
};
const shapeTask = (t) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    return ({
        id: t.id,
        orgId: t.orgId,
        title: t.title,
        notes: (_a = t.notes) !== null && _a !== void 0 ? _a : '',
        status: t.status,
        priority: t.priority,
        dueAt: t.dueAt,
        followUpAt: t.followUpAt,
        waitingOn: (_b = t.waitingOn) !== null && _b !== void 0 ? _b : '',
        assigneeId: (_c = t.assigneeId) !== null && _c !== void 0 ? _c : null,
        assigneeName: (_d = t.assigneeName) !== null && _d !== void 0 ? _d : '',
        projectId: (_e = t.projectId) !== null && _e !== void 0 ? _e : null,
        dependsOnId: (_f = t.dependsOnId) !== null && _f !== void 0 ? _f : null,
        meetingId: (_g = t.meetingId) !== null && _g !== void 0 ? _g : null,
        recurRule: (_h = t.recurRule) !== null && _h !== void 0 ? _h : 'none',
        recurEnd: t.recurEnd,
        createdBy: t.createdBy,
        createdByName: (_j = t.createdByName) !== null && _j !== void 0 ? _j : '',
        completedAt: t.completedAt,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
    });
};
const shapeProject = (p) => {
    var _a;
    return ({
        id: p.id,
        orgId: p.orgId,
        name: p.name,
        color: (_a = p.color) !== null && _a !== void 0 ? _a : '',
        createdBy: p.createdBy,
        createdAt: p.createdAt,
    });
};
/** Everything the Task Hub needs for an org: all tasks + all projects. */
const listTasks = (userId, orgId) => __awaiter(void 0, void 0, void 0, function* () {
    yield assertMember(userId, orgId);
    const [tasks, projects] = yield Promise.all([
        prisma.orgTask.findMany({
            where: { orgId },
            orderBy: { createdAt: 'desc' },
            take: 3000,
        }),
        prisma.orgProject.findMany({
            where: { orgId },
            orderBy: { createdAt: 'asc' },
        }),
    ]);
    return { tasks: tasks.map(shapeTask), projects: projects.map(shapeProject) };
});
const createTask = (userId, orgId, body) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g;
    yield assertMember(userId, orgId);
    const title = ((_a = body === null || body === void 0 ? void 0 : body.title) !== null && _a !== void 0 ? _a : '').toString().trim();
    if (!title)
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Task needs a title.');
    const me = yield prisma.user.findUnique({
        where: { id: userId },
        select: { fullName: true },
    });
    const status = TASK_STATUS.includes(body === null || body === void 0 ? void 0 : body.status) ? body.status : 'todo';
    const priority = TASK_PRIORITY.includes(body === null || body === void 0 ? void 0 : body.priority)
        ? body.priority
        : 'medium';
    const recurRule = RECUR.includes(body === null || body === void 0 ? void 0 : body.recurRule) ? body.recurRule : 'none';
    const task = yield prisma.orgTask.create({
        data: {
            orgId,
            title: title.slice(0, 200),
            notes: ((_b = body === null || body === void 0 ? void 0 : body.notes) !== null && _b !== void 0 ? _b : '').toString().slice(0, 4000),
            status,
            priority,
            dueAt: (_c = parseDate(body === null || body === void 0 ? void 0 : body.dueAt)) !== null && _c !== void 0 ? _c : null,
            followUpAt: (_d = parseDate(body === null || body === void 0 ? void 0 : body.followUpAt)) !== null && _d !== void 0 ? _d : null,
            waitingOn: ((_e = body === null || body === void 0 ? void 0 : body.waitingOn) !== null && _e !== void 0 ? _e : '').toString().slice(0, 200),
            assigneeId: oidOrNull(body === null || body === void 0 ? void 0 : body.assigneeId),
            assigneeName: ((_f = body === null || body === void 0 ? void 0 : body.assigneeName) !== null && _f !== void 0 ? _f : '').toString().slice(0, 120),
            projectId: oidOrNull(body === null || body === void 0 ? void 0 : body.projectId),
            dependsOnId: oidOrNull(body === null || body === void 0 ? void 0 : body.dependsOnId),
            meetingId: oidOrNull(body === null || body === void 0 ? void 0 : body.meetingId),
            recurRule,
            recurEnd: (_g = parseDate(body === null || body === void 0 ? void 0 : body.recurEnd)) !== null && _g !== void 0 ? _g : null,
            createdBy: userId,
            createdByName: (me === null || me === void 0 ? void 0 : me.fullName) || 'Member',
        },
    });
    return shapeTask(task);
});
/** Update any task field. Completing a recurring task spawns the next one. */
const updateTask = (userId, taskId, body) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (!taskId || !OID.test(taskId)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Bad task id.');
    }
    const task = yield prisma.orgTask.findUnique({ where: { id: taskId } });
    if (!task)
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'Task not found.');
    yield assertMember(userId, task.orgId);
    const data = { updatedAt: new Date() };
    if (typeof (body === null || body === void 0 ? void 0 : body.title) === 'string' && body.title.trim()) {
        data.title = body.title.trim().slice(0, 200);
    }
    if (typeof (body === null || body === void 0 ? void 0 : body.notes) === 'string')
        data.notes = body.notes.slice(0, 4000);
    if (TASK_PRIORITY.includes(body === null || body === void 0 ? void 0 : body.priority))
        data.priority = body.priority;
    if (RECUR.includes(body === null || body === void 0 ? void 0 : body.recurRule))
        data.recurRule = body.recurRule;
    if (typeof (body === null || body === void 0 ? void 0 : body.waitingOn) === 'string') {
        data.waitingOn = body.waitingOn.slice(0, 200);
    }
    if (body && 'assigneeId' in body)
        data.assigneeId = oidOrNull(body.assigneeId);
    if (typeof (body === null || body === void 0 ? void 0 : body.assigneeName) === 'string') {
        data.assigneeName = body.assigneeName.slice(0, 120);
    }
    if (body && 'projectId' in body)
        data.projectId = oidOrNull(body.projectId);
    if (body && 'dependsOnId' in body) {
        data.dependsOnId = oidOrNull(body.dependsOnId);
    }
    if (body && 'meetingId' in body)
        data.meetingId = oidOrNull(body.meetingId);
    const due = parseDate(body === null || body === void 0 ? void 0 : body.dueAt);
    if (due !== undefined)
        data.dueAt = due;
    const fu = parseDate(body === null || body === void 0 ? void 0 : body.followUpAt);
    if (fu !== undefined)
        data.followUpAt = fu;
    const re = parseDate(body === null || body === void 0 ? void 0 : body.recurEnd);
    if (re !== undefined)
        data.recurEnd = re;
    let spawned = null;
    if (TASK_STATUS.includes(body === null || body === void 0 ? void 0 : body.status)) {
        data.status = body.status;
        if (body.status === 'done' && task.status !== 'done') {
            data.completedAt = new Date();
            if (((_a = task.recurRule) !== null && _a !== void 0 ? _a : 'none') !== 'none') {
                const base = task.dueAt ? new Date(task.dueAt) : new Date();
                const nd = nextDue(base, task.recurRule);
                if (!task.recurEnd || nd <= new Date(task.recurEnd)) {
                    spawned = yield prisma.orgTask.create({
                        data: {
                            orgId: task.orgId,
                            title: task.title,
                            notes: task.notes,
                            status: 'todo',
                            priority: task.priority,
                            dueAt: nd,
                            followUpAt: null,
                            waitingOn: task.waitingOn,
                            assigneeId: task.assigneeId,
                            assigneeName: task.assigneeName,
                            projectId: task.projectId,
                            dependsOnId: null,
                            recurRule: task.recurRule,
                            recurEnd: task.recurEnd,
                            createdBy: userId,
                            createdByName: task.createdByName,
                        },
                    });
                }
            }
        }
        else if (body.status !== 'done') {
            data.completedAt = null;
        }
    }
    const updated = yield prisma.orgTask.update({
        where: { id: taskId },
        data,
    });
    return {
        task: shapeTask(updated),
        spawned: spawned ? shapeTask(spawned) : null,
    };
});
const deleteTask = (userId, taskId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!taskId || !OID.test(taskId))
        return { ok: true };
    const task = yield prisma.orgTask.findUnique({ where: { id: taskId } });
    if (!task)
        return { ok: true };
    yield assertMember(userId, task.orgId);
    yield prisma.orgTask.delete({ where: { id: taskId } });
    return { ok: true };
});
const createProject = (userId, orgId, body) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    yield assertMember(userId, orgId);
    const name = ((_a = body === null || body === void 0 ? void 0 : body.name) !== null && _a !== void 0 ? _a : '').toString().trim();
    if (!name)
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Project needs a name.');
    const project = yield prisma.orgProject.create({
        data: {
            orgId,
            name: name.slice(0, 120),
            color: ((_b = body === null || body === void 0 ? void 0 : body.color) !== null && _b !== void 0 ? _b : '').toString().slice(0, 20),
            createdBy: userId,
        },
    });
    return shapeProject(project);
});
const deleteProject = (userId, projectId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!projectId || !OID.test(projectId))
        return { ok: true };
    const project = yield prisma.orgProject.findUnique({
        where: { id: projectId },
    });
    if (!project)
        return { ok: true };
    yield assertMember(userId, project.orgId);
    // Detach tasks from the deleted project rather than orphaning them.
    yield prisma.orgTask.updateMany({
        where: { projectId },
        data: { projectId: null },
    });
    yield prisma.orgProject.delete({ where: { id: projectId } });
    return { ok: true };
});
// ── Meetings & Agenda (org-private) ───────────────────────────────────────────
const shapeMeeting = (m) => {
    var _a, _b, _c;
    return ({
        id: m.id,
        orgId: m.orgId,
        title: m.title,
        startAt: m.startAt,
        agenda: (_a = m.agenda) !== null && _a !== void 0 ? _a : '',
        notes: (_b = m.notes) !== null && _b !== void 0 ? _b : '',
        createdBy: m.createdBy,
        createdByName: (_c = m.createdByName) !== null && _c !== void 0 ? _c : '',
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
    });
};
const listMeetings = (userId, orgId) => __awaiter(void 0, void 0, void 0, function* () {
    yield assertMember(userId, orgId);
    const meetings = yield prisma.orgMeeting.findMany({
        where: { orgId },
        orderBy: { startAt: 'desc' },
        take: 1000,
    });
    return { meetings: meetings.map(shapeMeeting) };
});
const createMeeting = (userId, orgId, body) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    yield assertMember(userId, orgId);
    const title = ((_a = body === null || body === void 0 ? void 0 : body.title) !== null && _a !== void 0 ? _a : '').toString().trim();
    if (!title)
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Meeting needs a title.');
    const me = yield prisma.user.findUnique({
        where: { id: userId },
        select: { fullName: true },
    });
    const meeting = yield prisma.orgMeeting.create({
        data: {
            orgId,
            title: title.slice(0, 200),
            startAt: (_b = parseDate(body === null || body === void 0 ? void 0 : body.startAt)) !== null && _b !== void 0 ? _b : null,
            agenda: ((_c = body === null || body === void 0 ? void 0 : body.agenda) !== null && _c !== void 0 ? _c : '').toString().slice(0, 6000),
            notes: ((_d = body === null || body === void 0 ? void 0 : body.notes) !== null && _d !== void 0 ? _d : '').toString().slice(0, 6000),
            createdBy: userId,
            createdByName: (me === null || me === void 0 ? void 0 : me.fullName) || 'Member',
        },
    });
    return shapeMeeting(meeting);
});
const updateMeeting = (userId, meetingId, body) => __awaiter(void 0, void 0, void 0, function* () {
    if (!meetingId || !OID.test(meetingId)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Bad meeting id.');
    }
    const meeting = yield prisma.orgMeeting.findUnique({
        where: { id: meetingId },
    });
    if (!meeting)
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'Meeting not found.');
    yield assertMember(userId, meeting.orgId);
    const data = { updatedAt: new Date() };
    if (typeof (body === null || body === void 0 ? void 0 : body.title) === 'string' && body.title.trim()) {
        data.title = body.title.trim().slice(0, 200);
    }
    if (typeof (body === null || body === void 0 ? void 0 : body.agenda) === 'string')
        data.agenda = body.agenda.slice(0, 6000);
    if (typeof (body === null || body === void 0 ? void 0 : body.notes) === 'string')
        data.notes = body.notes.slice(0, 6000);
    const sa = parseDate(body === null || body === void 0 ? void 0 : body.startAt);
    if (sa !== undefined)
        data.startAt = sa;
    const updated = yield prisma.orgMeeting.update({
        where: { id: meetingId },
        data,
    });
    return shapeMeeting(updated);
});
const deleteMeeting = (userId, meetingId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!meetingId || !OID.test(meetingId))
        return { ok: true };
    const meeting = yield prisma.orgMeeting.findUnique({
        where: { id: meetingId },
    });
    if (!meeting)
        return { ok: true };
    yield assertMember(userId, meeting.orgId);
    // Keep the action items; just unlink them from the deleted meeting.
    yield prisma.orgTask.updateMany({
        where: { meetingId },
        data: { meetingId: null },
    });
    yield prisma.orgMeeting.delete({ where: { id: meetingId } });
    return { ok: true };
});
exports.OrgServices = {
    createOrg,
    joinOrg,
    getMine,
    getMyOrgs,
    getRoster,
    pushSummary,
    leaveOrg,
    setMap,
    setBooking,
    getSpace,
    createPost,
    toggleLike,
    deletePost,
    createGoal,
    bumpGoal,
    deleteGoal,
    setMemberRole,
    setTaskHub,
    setCanvass,
    listTasks,
    createTask,
    updateTask,
    deleteTask,
    createProject,
    deleteProject,
    listMeetings,
    createMeeting,
    updateMeeting,
    deleteMeeting,
};
