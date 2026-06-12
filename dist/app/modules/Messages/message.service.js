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
exports.MessageServices = void 0;
const http_status_1 = __importDefault(require("http-status"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const prisma_1 = require("../../utils/prisma");
const socket_1 = require("../../utils/socket");
const sendMessage = (senderId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const time = new Date();
    payload.senderId = senderId;
    const message = yield prisma_1.prisma.message.create({
        data: {
            senderId: payload.senderId,
            receiverId: payload.receiverId,
            content: payload.content,
            fileUrls: payload.fileUrls,
            createdAt: time
        },
    });
    const io = (0, socket_1.getSocket)();
    io.to(payload.receiverId).emit('message', message);
    io.to(payload.senderId).emit('message', message);
    return message;
});
const getConversation = (me, other) => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma_1.prisma.user.findUniqueOrThrow({ where: { id: other } });
    const messages = yield prisma_1.prisma.message.findMany({
        where: {
            OR: [
                { senderId: me, receiverId: other },
                { senderId: other, receiverId: me },
            ],
        },
        orderBy: { createdAt: 'asc' },
    });
    return messages;
});
const getAllConversationUsers = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const result = yield prisma_1.prisma.$runCommandRaw({
        aggregate: 'messages',
        pipeline: [
            {
                $match: {
                    $or: [
                        { senderId: { $oid: userId } },
                        { receiverId: { $oid: userId } },
                    ],
                },
            },
            {
                $sort: { createdAt: -1 }
            },
            {
                $project: {
                    otherUser: {
                        $cond: [
                            { $eq: ["$senderId", { $oid: userId }] },
                            "$receiverId",
                            "$senderId"
                        ]
                    },
                    content: 1,
                    createdAt: 1
                }
            },
            {
                $group: {
                    _id: "$otherUser",
                    lastMessageAt: { $first: "$createdAt" },
                    lastMessage: { $first: "$content" },
                    lastFiles: { $first: "$fileUrls" },
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: "_id",
                    foreignField: "_id",
                    as: "userData"
                }
            },
            {
                $unwind: "$userData"
            },
            {
                $project: {
                    _id: "$userData._id",
                    firstName: "$userData.firstName",
                    lastName: "$userData.lastName",
                    profile: "$userData.profile",
                    email: "$userData.email",
                    lastMessage: 1,
                    lastMessageAt: 1
                }
            },
            { $sort: { lastMessageAt: -1 } }
        ],
        cursor: {}
    });
    const convertedData = (_b = (_a = result === null || result === void 0 ? void 0 : result.cursor) === null || _a === void 0 ? void 0 : _a.firstBatch) === null || _b === void 0 ? void 0 : _b.map(item => {
        var _a;
        const newData = Object.assign(Object.assign({}, item), { id: (_a = item === null || item === void 0 ? void 0 : item._id) === null || _a === void 0 ? void 0 : _a.$oid, lastMessageAt: item.lastMessageAt.$date });
        delete newData._id;
        return newData;
    });
    return convertedData;
});
const markMessageAsRead = (messageId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const message = yield prisma_1.prisma.message.findUniqueOrThrow({
        where: { id: messageId },
    });
    if (message.receiverId !== userId) {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, 'You are not allowed to mark this message');
    }
    const updatedMessage = yield prisma_1.prisma.message.update({
        where: { id: messageId },
        data: { isRead: true },
    });
    return updatedMessage;
});
const deleteMessage = (messageId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const message = yield prisma_1.prisma.message.findUniqueOrThrow({
        where: { id: messageId },
    });
    if (message.senderId !== userId) {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, 'You can only delete your own messages');
    }
    yield prisma_1.prisma.message.delete({
        where: { id: messageId },
    });
    return { message: 'Message deleted successfully' };
});
exports.MessageServices = {
    sendMessage,
    getConversation,
    markMessageAsRead,
    deleteMessage,
    getAllConversationUsers
};
