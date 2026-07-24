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
exports.FriendsServices = void 0;
const client_1 = require("@prisma/client");
const http_status_1 = __importDefault(require("http-status"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const prisma = new client_1.PrismaClient();

/** Public shape of the person on the other end of a request/friendship. */
const userSelect = {
    id: true,
    fullName: true,
    username: true,
    profile: true,
};

/** The single row (any direction, any status) between two users, or null. */
const edgeBetween = (a, b) => prisma.friendRequest.findFirst({
    where: {
        OR: [
            { fromId: a, toId: b },
            { fromId: b, toId: a },
        ],
    },
});

/**
 * Send a friend request. Idempotent-ish by design:
 *  - already friends            -> 409
 *  - I already asked            -> 409
 *  - THEY already asked me      -> auto-accept (mutual intent = friends)
 *  - they declined me earlier   -> flips the old row back to pending
 */
const sendRequest = (myId, toUserId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!toUserId || toUserId === myId) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "You can't friend yourself.");
    }
    const target = yield prisma.user.findFirst({
        where: { id: toUserId, isDeleted: false },
        select: { id: true },
    });
    if (!target)
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'User not found');
    const existing = yield edgeBetween(myId, toUserId);
    if (!existing) {
        const created = yield prisma.friendRequest.create({
            data: { fromId: myId, toId: toUserId },
        });
        return { request: created, becameFriends: false };
    }
    if (existing.status === 'accepted') {
        throw new AppError_1.default(http_status_1.default.CONFLICT, "You're already friends.");
    }
    if (existing.status === 'pending') {
        if (existing.fromId === myId) {
            throw new AppError_1.default(http_status_1.default.CONFLICT, 'Request already sent.');
        }
        // They asked me first and I'm now asking them — that's a yes.
        const accepted = yield prisma.friendRequest.update({
            where: { id: existing.id },
            data: { status: 'accepted' },
        });
        return { request: accepted, becameFriends: true };
    }
    // declined earlier — allow a fresh ask, re-pointed at the new sender.
    const revived = yield prisma.friendRequest.update({
        where: { id: existing.id },
        data: { fromId: myId, toId: toUserId, status: 'pending' },
    });
    return { request: revived, becameFriends: false };
});

/** Incoming + sent PENDING requests, each with the counterpart's info. */
const listRequests = (myId) => __awaiter(void 0, void 0, void 0, function* () {
    const [incoming, sent] = yield Promise.all([
        prisma.friendRequest.findMany({
            where: { toId: myId, status: 'pending' },
            orderBy: { createdAt: 'desc' },
            include: { from: { select: userSelect } },
        }),
        prisma.friendRequest.findMany({
            where: { fromId: myId, status: 'pending' },
            orderBy: { createdAt: 'desc' },
            include: { to: { select: userSelect } },
        }),
    ]);
    return {
        incoming: incoming.map((r) => ({
            id: r.id,
            user: r.from,
            sentAt: r.createdAt,
        })),
        sent: sent.map((r) => ({ id: r.id, user: r.to, sentAt: r.createdAt })),
    };
});

/** Recipient accepts a pending request. */
const acceptRequest = (myId, requestId) => __awaiter(void 0, void 0, void 0, function* () {
    const req = yield prisma.friendRequest.findFirst({
        where: { id: requestId, toId: myId, status: 'pending' },
    });
    if (!req)
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'Request not found');
    const updated = yield prisma.friendRequest.update({
        where: { id: req.id },
        data: { status: 'accepted' },
    });
    return updated;
});

/** Recipient declines a pending request. */
const declineRequest = (myId, requestId) => __awaiter(void 0, void 0, void 0, function* () {
    const req = yield prisma.friendRequest.findFirst({
        where: { id: requestId, toId: myId, status: 'pending' },
    });
    if (!req)
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'Request not found');
    return prisma.friendRequest.update({
        where: { id: req.id },
        data: { status: 'declined' },
    });
});

/** Sender cancels their own pending request. */
const cancelRequest = (myId, requestId) => __awaiter(void 0, void 0, void 0, function* () {
    const req = yield prisma.friendRequest.findFirst({
        where: { id: requestId, fromId: myId, status: 'pending' },
    });
    if (!req)
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'Request not found');
    yield prisma.friendRequest.delete({ where: { id: req.id } });
    return true;
});

/** All accepted friendships, flattened to the counterpart's info. */
const listFriends = (myId) => __awaiter(void 0, void 0, void 0, function* () {
    const rows = yield prisma.friendRequest.findMany({
        where: {
            status: 'accepted',
            OR: [{ fromId: myId }, { toId: myId }],
        },
        orderBy: { updatedAt: 'desc' },
        include: {
            from: { select: userSelect },
            to: { select: userSelect },
        },
    });
    return rows.map((r) => ({
        friendedAt: r.updatedAt,
        user: r.fromId === myId ? r.to : r.from,
    }));
});

/** Remove a friend (deletes the accepted edge between the two users). */
const removeFriend = (myId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const edge = yield prisma.friendRequest.findFirst({
        where: {
            status: 'accepted',
            OR: [
                { fromId: myId, toId: userId },
                { fromId: userId, toId: myId },
            ],
        },
    });
    if (!edge)
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'Not friends');
    yield prisma.friendRequest.delete({ where: { id: edge.id } });
    return true;
});

exports.FriendsServices = {
    sendRequest,
    listRequests,
    acceptRequest,
    declineRequest,
    cancelRequest,
    listFriends,
    removeFriend,
};
