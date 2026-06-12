"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsRouters = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const notification_controller_1 = require("./notification.controller");
exports.NotificationsRouters = express_1.default.Router();
// Get all notifications for the authenticated user
exports.NotificationsRouters.get('/', (0, auth_1.default)('ANY'), notification_controller_1.notificationsControllers.getAllNotifications);
// Get all users by a specific notification ID
exports.NotificationsRouters.get('/users/:notificationId', (0, auth_1.default)('ADMIN'), notification_controller_1.notificationsControllers.getUsersByNotification);
// Mark a specific notification as read for the authenticated user
exports.NotificationsRouters.patch('/read/:notificationId', (0, auth_1.default)('ANY'), notification_controller_1.notificationsControllers.markNotificationAsRead);
// Get the unread notification count for the authenticated user
exports.NotificationsRouters.get('/unread/count', (0, auth_1.default)('ANY'), notification_controller_1.notificationsControllers.getUnreadNotificationCount);
// Mark all notifications as read for the authenticated user
exports.NotificationsRouters.patch('/read-all', (0, auth_1.default)('ANY'), notification_controller_1.notificationsControllers.markAllNotificationsAsRead);
