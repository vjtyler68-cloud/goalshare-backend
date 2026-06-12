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
exports.notificationServices = void 0;
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const socket_1 = require("../../utils/socket");
const prisma_1 = require("../../utils/prisma");
const createNotification = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, message, type, userIds, redirectEndpoint } = payload;
    const io = (0, socket_1.getSocket)();
    // Create the notification
    const notification = yield prisma_1.prisma.notification.create({
        data: {
            title,
            message,
            type,
            redirectEndpoint: redirectEndpoint || '',
        },
    });
    // Save notification recipients and emit socket events
    if (userIds.length > 0) {
        const NotificationUsers = userIds.map(userId => ({
            notificationId: notification.id,
            userId,
        }));
        yield prisma_1.prisma.notificationUser.createMany({
            data: NotificationUsers,
        });
        userIds.forEach(id => {
            console.log(`Emitting to user: ${id}`);
            io.to(id).emit('notification', Object.assign(Object.assign({}, notification), { isRead: false }));
            console.log(`Notification emitted to ${id}`);
        });
        console.log(`Notification sent to ${userIds.length} users:`, userIds);
    }
    else {
        console.log('No users provided for notification');
    }
    return notification;
});
const getAllNotificationsByUser = (id, query) => __awaiter(void 0, void 0, void 0, function* () {
    query.userId = id;
    const notificationQuery = new QueryBuilder_1.default(prisma_1.prisma.notificationUser, query);
    const result = yield notificationQuery
        .search(['name'])
        .filter()
        .sort()
        .exclude()
        .paginate()
        .customFields({
        id: true,
        isRead: true,
        notificationId: true,
        createdAt: true,
        notification: {
            select: {
                id: true,
                message: true,
                createdAt: true,
                title: true,
                type: true,
                redirectEndpoint: true,
            },
        },
        receivedAt: true,
        updatedAt: true,
        userId: true,
        user: {
            select: {
                fullName: true,
                email: true,
                role: true,
            },
        },
    })
        .execute();
    return result;
});
const getUsersByNotification = (notificationId) => __awaiter(void 0, void 0, void 0, function* () {
    const users = yield prisma_1.prisma.notificationUser.findMany({
        where: {
            notificationId: notificationId,
        },
        include: {
            user: true,
        },
    });
    return users.map(recipient => recipient.user);
});
const markNotificationAsRead = (notificationId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const updatedRecipient = yield prisma_1.prisma.notificationUser.updateMany({
        where: {
            notificationId: notificationId,
            userId: userId,
        },
        data: {
            isRead: true,
        },
    });
    return updatedRecipient;
});
const getUnreadNotificationCount = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const count = yield prisma_1.prisma.notificationUser.count({
        where: {
            userId: userId,
            isRead: false,
        },
    });
    return count;
});
const markAllNotificationsAsRead = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const updatedRecipients = yield prisma_1.prisma.notificationUser.updateMany({
        where: {
            userId: userId,
            isRead: false,
        },
        data: {
            isRead: true,
        },
    });
    return updatedRecipients;
});
exports.notificationServices = {
    createNotification,
    getAllNotificationsByUser,
    getUsersByNotification,
    markNotificationAsRead,
    getUnreadNotificationCount,
    markAllNotificationsAsRead,
};
