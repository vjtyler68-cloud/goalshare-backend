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
exports.AccountabilityServices = void 0;
const client_1 = require("@prisma/client");
const http_status_1 = __importDefault(require("http-status"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const prisma = new client_1.PrismaClient();
const DAY_MS = 24 * 60 * 60 * 1000;
const CYCLE_DAYS = 7;
const MIN_CHECKINS_TO_RATE = 2;
const round3 = (n) => Math.round(n * 1000) / 1000;
/** Fields a client is allowed to write. Stats + cycle state are server-owned. */
const pickProfileInput = (body) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    return ({
        displayName: ((_a = body === null || body === void 0 ? void 0 : body.displayName) !== null && _a !== void 0 ? _a : '').toString(),
        avatarUrl: ((_b = body === null || body === void 0 ? void 0 : body.avatarUrl) !== null && _b !== void 0 ? _b : '').toString(),
        gender: ((_c = body === null || body === void 0 ? void 0 : body.gender) !== null && _c !== void 0 ? _c : 'Unspecified').toString(),
        focusArea: ((_d = body === null || body === void 0 ? void 0 : body.focusArea) !== null && _d !== void 0 ? _d : '').toString(),
        monthlyGoal: ((_e = body === null || body === void 0 ? void 0 : body.monthlyGoal) !== null && _e !== void 0 ? _e : '').toString(),
        funFact: ((_f = body === null || body === void 0 ? void 0 : body.funFact) !== null && _f !== void 0 ? _f : '').toString(),
        timezone: ((_g = body === null || body === void 0 ? void 0 : body.timezone) !== null && _g !== void 0 ? _g : '').toString(),
        genderPreference: ((_h = body === null || body === void 0 ? void 0 : body.genderPreference) !== null && _h !== void 0 ? _h : 'NoPreference').toString(),
        openToOtherGoalAreas: (body === null || body === void 0 ? void 0 : body.openToOtherGoalAreas) !== false,
        extendPreference: ((_j = body === null || body === void 0 ? void 0 : body.extendPreference) !== null && _j !== void 0 ? _j : 'LetsSee').toString(),
    });
};
/** Create or update my matching profile (stats untouched). */
const upsertProfile = (myId, body) => __awaiter(void 0, void 0, void 0, function* () {
    const input = pickProfileInput(body);
    return prisma.accountabilityProfile.upsert({
        where: { userId: myId },
        create: Object.assign({ userId: myId }, input),
        update: input,
    });
});
const getMyProfile = (myId) => __awaiter(void 0, void 0, void 0, function* () { return prisma.accountabilityProfile.findUnique({ where: { userId: myId } }); });
const setOptIn = (myId, optedIn) => __awaiter(void 0, void 0, void 0, function* () {
    const profile = yield prisma.accountabilityProfile.findUnique({
        where: { userId: myId },
    });
    if (!profile) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Set up your buddy profile first.');
    }
    return prisma.accountabilityProfile.update({
        where: { userId: myId },
        data: { optedInForNextCycle: optedIn },
    });
});
/** The user's current pairing — their profile's pinned match, else the latest
 *  active one they're part of. */
const getCurrentMatch = (myId) => __awaiter(void 0, void 0, void 0, function* () {
    const profile = yield prisma.accountabilityProfile.findUnique({
        where: { userId: myId },
    });
    if (profile === null || profile === void 0 ? void 0 : profile.currentMatchId) {
        const m = yield prisma.accountabilityMatch.findUnique({
            where: { id: profile.currentMatchId },
        });
        if (m)
            return m;
    }
    return prisma.accountabilityMatch.findFirst({
        where: { status: 'active', OR: [{ userAId: myId }, { userBId: myId }] },
        orderBy: { createdAt: 'desc' },
    });
});
const requireMyMatch = (myId) => __awaiter(void 0, void 0, void 0, function* () {
    const m = yield getCurrentMatch(myId);
    if (!m)
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'No active buddy.');
    return m;
});
const logCheckIn = (myId) => __awaiter(void 0, void 0, void 0, function* () {
    const m = yield requireMyMatch(myId);
    const isA = m.userAId === myId;
    return prisma.accountabilityMatch.update({
        where: { id: m.id },
        data: isA
            ? { checkInCountA: m.checkInCountA + 1 }
            : { checkInCountB: m.checkInCountB + 1 },
    });
});
const requestExtend = (myId, value) => __awaiter(void 0, void 0, void 0, function* () {
    const m = yield requireMyMatch(myId);
    const isA = m.userAId === myId;
    return prisma.accountabilityMatch.update({
        where: { id: m.id },
        data: isA ? { extendRequestedByA: value } : { extendRequestedByB: value },
    });
});
/** Rate my buddy for this cycle. Gated behind >= 2 check-ins, once only.
 *  Updates the BUDDY's public reputation (running average) — the real
 *  cross-user piece — and frees me to be matched again. */
const submitRating = (myId, stars, comment) => __awaiter(void 0, void 0, void 0, function* () {
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Rating must be 1–5.');
    }
    const m = yield requireMyMatch(myId);
    const isA = m.userAId === myId;
    const myCheckIns = isA ? m.checkInCountA : m.checkInCountB;
    const already = isA ? m.userARating : m.userBRating;
    if (myCheckIns < MIN_CHECKINS_TO_RATE) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Log at least ${MIN_CHECKINS_TO_RATE} check-ins before rating.`);
    }
    if (already != null) {
        throw new AppError_1.default(http_status_1.default.CONFLICT, 'You already rated this cycle.');
    }
    const now = new Date();
    const buddyId = isA ? m.userBId : m.userAId;
    yield prisma.accountabilityMatch.update({
        where: { id: m.id },
        data: isA
            ? { userARating: stars, userARatedAt: now, userAComment: comment }
            : { userBRating: stars, userBRatedAt: now, userBComment: comment },
    });
    const buddy = yield prisma.accountabilityProfile.findUnique({
        where: { userId: buddyId },
    });
    if (buddy) {
        const newAvg = (buddy.avgRating * buddy.totalRatings + stars) / (buddy.totalRatings + 1);
        yield prisma.accountabilityProfile.update({
            where: { userId: buddyId },
            data: {
                avgRating: round3(newAvg),
                totalRatings: buddy.totalRatings + 1,
                cyclesCompleted: buddy.cyclesCompleted + 1,
            },
        });
    }
    // Free me for the next cycle.
    yield prisma.accountabilityProfile
        .update({ where: { userId: myId }, data: { currentMatchId: null } })
        .catch(() => undefined);
    return { ok: true };
});
// ── Weekly pairing ──────────────────────────────────────────────────────────
const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};
const compatible = (a, b) => {
    if (a.genderPreference === 'SameGenderOnly' &&
        (a.gender === 'Unspecified' || a.gender !== b.gender)) {
        return false;
    }
    if (b.genderPreference === 'SameGenderOnly' &&
        (b.gender === 'Unspecified' || b.gender !== a.gender)) {
        return false;
    }
    return true;
};
const freeUser = (userId, matchId) => __awaiter(void 0, void 0, void 0, function* () {
    const p = yield prisma.accountabilityProfile.findUnique({ where: { userId } });
    if ((p === null || p === void 0 ? void 0 : p.currentMatchId) === matchId) {
        yield prisma.accountabilityProfile.update({
            where: { userId },
            data: { currentMatchId: null },
        });
    }
});
const createMatch = (a, b, now) => __awaiter(void 0, void 0, void 0, function* () {
    const weekEnd = new Date(now.getTime() + CYCLE_DAYS * DAY_MS);
    const match = yield prisma.accountabilityMatch.create({
        data: {
            userAId: a.userId,
            userBId: b.userId,
            weekStartDate: now,
            weekEndDate: weekEnd,
            status: 'active',
            userAName: a.displayName,
            userBName: b.displayName,
            userAAvatar: a.avatarUrl,
            userBAvatar: b.avatarUrl,
            userAFocus: a.focusArea,
            userBFocus: b.focusArea,
            userAGoal: a.monthlyGoal,
            userBGoal: b.monthlyGoal,
            userAFunFact: a.funFact,
            userBFunFact: b.funFact,
            userARatingAvg: a.avgRating,
            userBRatingAvg: b.avgRating,
            userACycles: a.cyclesCompleted,
            userBCycles: b.cyclesCompleted,
        },
    });
    yield prisma.accountabilityProfile.update({
        where: { userId: a.userId },
        data: { currentMatchId: match.id, optedInForNextCycle: false },
    });
    yield prisma.accountabilityProfile.update({
        where: { userId: b.userId },
        data: { currentMatchId: match.id, optedInForNextCycle: false },
    });
    return match;
});
/**
 * The weekly job. Extends mutually-agreed matches, completes finished ones, then
 * pairs the opted-in pool: bucket by timezone, respect Same-gender-only, shuffle
 * (Fisher-Yates), pair greedily by compatibility. Odd leftovers stay opted-in
 * and roll into the next run. Trigger via the cron endpoint (secret-guarded).
 */
const runWeeklyPairing = () => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    // 1. Extend or complete matches whose cycle has ended.
    const active = yield prisma.accountabilityMatch.findMany({
        where: { status: 'active' },
    });
    let extended = 0;
    let completed = 0;
    for (const m of active) {
        if (m.weekEndDate > now)
            continue;
        if (m.extendRequestedByA && m.extendRequestedByB) {
            yield prisma.accountabilityMatch.update({
                where: { id: m.id },
                data: {
                    weekEndDate: new Date(m.weekEndDate.getTime() + CYCLE_DAYS * DAY_MS),
                    extendRequestedByA: false,
                    extendRequestedByB: false,
                },
            });
            extended++;
        }
        else {
            yield prisma.accountabilityMatch.update({
                where: { id: m.id },
                data: { status: 'completed' },
            });
            yield freeUser(m.userAId, m.id);
            yield freeUser(m.userBId, m.id);
            completed++;
        }
    }
    // 2. Pair the opted-in, currently-unmatched pool.
    const pool = yield prisma.accountabilityProfile.findMany({
        where: { optedInForNextCycle: true, currentMatchId: null },
    });
    const buckets = {};
    for (const p of pool) {
        const key = p.timezone || 'unknown';
        (buckets[key] || (buckets[key] = [])).push(p);
    }
    let paired = 0;
    for (const key of Object.keys(buckets)) {
        const list = shuffle(buckets[key]);
        const used = new Set();
        for (let i = 0; i < list.length; i++) {
            const a = list[i];
            if (used.has(a.userId))
                continue;
            let partner = null;
            for (let j = i + 1; j < list.length; j++) {
                const b = list[j];
                if (used.has(b.userId))
                    continue;
                if (compatible(a, b)) {
                    partner = b;
                    break;
                }
            }
            if (partner) {
                used.add(a.userId);
                used.add(partner.userId);
                yield createMatch(a, partner, now);
                paired++;
            }
        }
    }
    return {
        ranAt: now.toISOString(),
        poolSize: pool.length,
        pairsCreated: paired,
        matchesExtended: extended,
        matchesCompleted: completed,
        held: pool.length - paired * 2,
    };
});
exports.AccountabilityServices = {
    upsertProfile,
    getMyProfile,
    setOptIn,
    getCurrentMatch,
    logCheckIn,
    requestExtend,
    submitRating,
    runWeeklyPairing,
};
