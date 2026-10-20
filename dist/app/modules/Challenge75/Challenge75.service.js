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
exports.Challenge75Services = void 0;
const client_1 = require("@prisma/client");
const http_status_1 = __importDefault(require("http-status"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const prisma = new client_1.PrismaClient();
// Unambiguous invite code (no 0/O/1/I/L) so it's easy to read out / text.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const genCode = () => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
const nameOf = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const u = yield prisma.user.findUnique({
        where: { id: userId },
        select: { fullName: true },
    });
    return (u === null || u === void 0 ? void 0 : u.fullName) || 'Member';
});
const normalizeCode = (raw) => (raw !== null && raw !== void 0 ? raw : '').toString().trim().toUpperCase();
/** Create or refresh the caller's progress row in a crew. */
const upsertMember = (crewId, userId, body) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    const data = {
        name: yield nameOf(userId),
        variantId: ((_a = body === null || body === void 0 ? void 0 : body.variantId) !== null && _a !== void 0 ? _a : '').toString(),
        day: Number((_b = body === null || body === void 0 ? void 0 : body.day) !== null && _b !== void 0 ? _b : 0) || 0,
        daysCompleted: Number((_c = body === null || body === void 0 ? void 0 : body.daysCompleted) !== null && _c !== void 0 ? _c : 0) || 0,
        streak: Number((_d = body === null || body === void 0 ? void 0 : body.streak) !== null && _d !== void 0 ? _d : 0) || 0,
        completionToday: Number((_e = body === null || body === void 0 ? void 0 : body.completionToday) !== null && _e !== void 0 ? _e : 0) || 0,
        todayComplete: Boolean((_f = body === null || body === void 0 ? void 0 : body.todayComplete) !== null && _f !== void 0 ? _f : false),
    };
    const existing = yield prisma.challenge75Member.findFirst({
        where: { crewId, userId },
    });
    if (existing) {
        return prisma.challenge75Member.update({
            where: { id: existing.id },
            data,
        });
    }
    return prisma.challenge75Member.create({
        data: Object.assign({ crewId, userId }, data),
    });
});
const createCrew = (userId, body) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const name = ((_a = body === null || body === void 0 ? void 0 : body.name) !== null && _a !== void 0 ? _a : '').toString().trim() || 'My 75 Crew';
    // Pick a code that isn't already taken (collisions are rare; retry a few).
    let code = genCode();
    for (let i = 0; i < 5; i++) {
        const existing = yield prisma.challenge75Crew.findUnique({ where: { code } });
        if (!existing)
            break;
        code = genCode();
    }
    const crew = yield prisma.challenge75Crew.create({
        data: { code, name, ownerId: userId, memberIds: [userId] },
    });
    yield upsertMember(crew.id, userId, body);
    return { code: crew.code, name: crew.name, crewId: crew.id };
});
const joinCrew = (userId, body) => __awaiter(void 0, void 0, void 0, function* () {
    const code = normalizeCode(body === null || body === void 0 ? void 0 : body.code);
    if (!code)
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'A crew code is required.');
    const crew = yield prisma.challenge75Crew.findUnique({ where: { code } });
    if (!crew)
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'No crew with that code.');
    if (!crew.memberIds.includes(userId)) {
        yield prisma.challenge75Crew.update({
            where: { id: crew.id },
            data: { memberIds: { push: userId } },
        });
    }
    yield upsertMember(crew.id, userId, body);
    return { code: crew.code, name: crew.name, crewId: crew.id };
});
const leaveCrew = (userId, body) => __awaiter(void 0, void 0, void 0, function* () {
    const code = normalizeCode(body === null || body === void 0 ? void 0 : body.code);
    const crew = yield prisma.challenge75Crew.findUnique({ where: { code } });
    if (!crew)
        return { left: true };
    yield prisma.challenge75Crew.update({
        where: { id: crew.id },
        data: { memberIds: { set: crew.memberIds.filter(id => id !== userId) } },
    });
    yield prisma.challenge75Member.deleteMany({
        where: { crewId: crew.id, userId },
    });
    return { left: true };
});
const pushProgress = (userId, body) => __awaiter(void 0, void 0, void 0, function* () {
    const code = normalizeCode(body === null || body === void 0 ? void 0 : body.code);
    if (!code)
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'A crew code is required.');
    const crew = yield prisma.challenge75Crew.findUnique({ where: { code } });
    if (!crew)
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'No crew with that code.');
    if (!crew.memberIds.includes(userId)) {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, 'You are not in this crew.');
    }
    yield upsertMember(crew.id, userId, body);
    return { ok: true };
});
const listMembers = (userId, codeRaw) => __awaiter(void 0, void 0, void 0, function* () {
    const code = normalizeCode(codeRaw);
    if (!code)
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'A crew code is required.');
    const crew = yield prisma.challenge75Crew.findUnique({ where: { code } });
    if (!crew)
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'No crew with that code.');
    if (!crew.memberIds.includes(userId)) {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, 'You are not in this crew.');
    }
    const members = yield prisma.challenge75Member.findMany({
        where: { crewId: crew.id },
        orderBy: { daysCompleted: 'desc' },
    });
    return {
        code: crew.code,
        name: crew.name,
        members: members.map(m => ({
            userId: m.userId,
            name: m.name,
            variantId: m.variantId,
            day: m.day,
            daysCompleted: m.daysCompleted,
            streak: m.streak,
            completionToday: m.completionToday,
            todayComplete: m.todayComplete,
        })),
    };
});
exports.Challenge75Services = {
    createCrew,
    joinCrew,
    leaveCrew,
    pushProgress,
    listMembers,
};
