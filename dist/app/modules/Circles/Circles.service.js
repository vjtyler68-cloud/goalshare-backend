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
exports.CirclesServices = void 0;
const client_1 = require("@prisma/client");
const http_status_1 = __importDefault(require("http-status"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const prisma = new client_1.PrismaClient();
const OID = /^[a-f0-9]{24}$/i;
const MAX_MEMBERS = 5;
const pad = (n) => n.toString().padStart(2, '0');
const serverDate = () => {
    const n = new Date();
    return `${n.getUTCFullYear()}-${pad(n.getUTCMonth() + 1)}-${pad(n.getUTCDate())}`;
};
const addDays = (dateStr, delta) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + delta);
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
};
const findMyCircle = (myId) => prisma.accountabilityCircle.findFirst({ where: { memberIds: { has: myId } } });
/** Create a squad from the current user + chosen friends (3-5 total, cap 5).
 *  One active circle per user. */
const createCircle = (myId, body) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const existing = yield findMyCircle(myId);
    if (existing) {
        throw new AppError_1.default(http_status_1.default.CONFLICT, 'You are already in a circle. Leave it first.');
    }
    const invited = Array.isArray(body === null || body === void 0 ? void 0 : body.memberIds)
        ? body.memberIds.map((x) => (x !== null && x !== void 0 ? x : '').toString()).filter((x) => OID.test(x))
        : [];
    const memberIds = Array.from(new Set([myId, ...invited])).slice(0, MAX_MEMBERS);
    if (memberIds.length < 2) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Add at least one friend.');
    }
    const users = yield prisma.user.findMany({
        where: { id: { in: memberIds } },
        select: { id: true, fullName: true, profile: true },
    });
    const byId = {};
    for (const u of users)
        byId[u.id] = u;
    const memberNames = memberIds.map(id => { var _a; return ((_a = byId[id]) === null || _a === void 0 ? void 0 : _a.fullName) || 'Member'; });
    const memberAvatars = memberIds.map(id => { var _a; return ((_a = byId[id]) === null || _a === void 0 ? void 0 : _a.profile) || ''; });
    return prisma.accountabilityCircle.create({
        data: {
            name: ((_a = body === null || body === void 0 ? void 0 : body.name) !== null && _a !== void 0 ? _a : '').toString().trim() || 'Our Circle',
            ownerId: myId,
            memberIds,
            memberNames,
            memberAvatars,
        },
    });
});
const majorityThreshold = (memberCount) => Math.max(2, Math.ceil(memberCount / 2));
/** The current user's circle with member statuses (today) + the shared streak. */
const getMyCircle = (myId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    var _c;
    const circle = yield findMyCircle(myId);
    if (!circle)
        return { circle: null };
    const checkins = yield prisma.accountabilityCircleCheckin.findMany({
        where: { circleId: circle.id },
        orderBy: { date: 'desc' },
    });
    const today = serverDate();
    // Latest proof per (user, day) and set of members present per day.
    const presentByDate = {};
    const todayByUser = {};
    for (const c of checkins) {
        (presentByDate[_c = c.date] || (presentByDate[_c] = new Set())).add(c.userId);
        if (c.date === today && !todayByUser[c.userId]) {
            todayByUser[c.userId] = { proofUrl: c.proofUrl, note: c.note };
        }
    }
    const threshold = majorityThreshold(circle.memberIds.length);
    const shielded = new Set(circle.shieldedDates);
    const counts = (date) => { var _a, _b; return ((_b = (_a = presentByDate[date]) === null || _a === void 0 ? void 0 : _a.size) !== null && _b !== void 0 ? _b : 0) >= threshold || shielded.has(date); };
    // Streak = consecutive counting days ending at the most recent counting day.
    const countingDates = Object.keys(presentByDate)
        .concat(circle.shieldedDates)
        .filter(counts);
    let ourStreak = 0;
    if (countingDates.length) {
        const set = new Set(countingDates);
        const sorted = Array.from(set).sort();
        let cur = sorted[sorted.length - 1];
        ourStreak = 1;
        while (set.has(addDays(cur, -1))) {
            ourStreak++;
            cur = addDays(cur, -1);
        }
    }
    const members = circle.memberIds.map((id, i) => {
        var _a;
        return ({
            id,
            name: circle.memberNames[i] || 'Member',
            avatar: circle.memberAvatars[i] || '',
            isMe: id === myId,
            checkedInToday: !!todayByUser[id],
            proofUrl: ((_a = todayByUser[id]) === null || _a === void 0 ? void 0 : _a.proofUrl) || '',
        });
    });
    return {
        circle: {
            id: circle.id,
            name: circle.name,
            ownerId: circle.ownerId,
            shields: circle.shields,
            memberCount: circle.memberIds.length,
            threshold,
        },
        members,
        ourStreak,
        todayCount: (_b = (_a = presentByDate[today]) === null || _a === void 0 ? void 0 : _a.size) !== null && _b !== void 0 ? _b : 0,
    };
});
const checkinCircle = (myId, body) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const circle = yield findMyCircle(myId);
    if (!circle)
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'You are not in a circle.');
    const date = (((_a = body === null || body === void 0 ? void 0 : body.date) !== null && _a !== void 0 ? _a : '').toString() || serverDate()).slice(0, 10);
    const proofUrl = ((_b = body === null || body === void 0 ? void 0 : body.proofUrl) !== null && _b !== void 0 ? _b : '').toString();
    const note = ((_c = body === null || body === void 0 ? void 0 : body.note) !== null && _c !== void 0 ? _c : '').toString();
    const existing = yield prisma.accountabilityCircleCheckin.findFirst({
        where: { circleId: circle.id, userId: myId, date },
    });
    if (existing) {
        return prisma.accountabilityCircleCheckin.update({
            where: { id: existing.id },
            data: {
                proofUrl: proofUrl || existing.proofUrl,
                note: note || existing.note,
            },
        });
    }
    return prisma.accountabilityCircleCheckin.create({
        data: { circleId: circle.id, userId: myId, date, proofUrl, note },
    });
});
/** Burn a shield to save a day's streak (defaults to yesterday). */
const burnShield = (myId, body) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const circle = yield findMyCircle(myId);
    if (!circle)
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'You are not in a circle.');
    if (circle.shields <= 0) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'No shields left this cycle.');
    }
    const date = (((_a = body === null || body === void 0 ? void 0 : body.date) !== null && _a !== void 0 ? _a : '').toString() || addDays(serverDate(), -1)).slice(0, 10);
    if (circle.shieldedDates.includes(date)) {
        return { ok: true, shields: circle.shields };
    }
    const updated = yield prisma.accountabilityCircle.update({
        where: { id: circle.id },
        data: {
            shields: circle.shields - 1,
            shieldedDates: { push: date },
        },
    });
    return { ok: true, shields: updated.shields };
});
const leaveCircle = (myId) => __awaiter(void 0, void 0, void 0, function* () {
    const circle = yield findMyCircle(myId);
    if (!circle)
        return { ok: true };
    const idx = circle.memberIds.indexOf(myId);
    if (idx === -1)
        return { ok: true };
    const memberIds = circle.memberIds.filter((_, i) => i !== idx);
    if (memberIds.length === 0) {
        yield prisma.accountabilityCircle.delete({ where: { id: circle.id } });
        return { ok: true };
    }
    yield prisma.accountabilityCircle.update({
        where: { id: circle.id },
        data: {
            memberIds,
            memberNames: circle.memberNames.filter((_, i) => i !== idx),
            memberAvatars: circle.memberAvatars.filter((_, i) => i !== idx),
        },
    });
    return { ok: true };
});
exports.CirclesServices = {
    createCircle,
    getMyCircle,
    checkinCircle,
    burnShield,
    leaveCircle,
};
