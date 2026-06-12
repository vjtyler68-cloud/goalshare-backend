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
exports.notificationsControllers = void 0;
const http_status_1 = __importDefault(require("http-status"));
const catchAsync_1 = __importDefault(require("../../utils/catchAsync"));
const sendResponse_1 = __importDefault(require("../../utils/sendResponse"));
const notification_service_1 = require("./notification.service");
// Get all notifications for the logged-in user
const getAllNotifications = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield notification_service_1.notificationServices.getAllNotificationsByUser(req.user.id, req.query);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        message: 'Notifications retrieved successfully',
        data: result,
    });
}));
// Get users who received a specific notification
const getUsersByNotification = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { notificationId } = req.params;
    const result = yield notification_service_1.notificationServices.getUsersByNotification(notificationId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        message: 'Users by notification retrieved successfully',
        data: result,
    });
}));
// Mark a specific notification as read for the logged-in user
const markNotificationAsRead = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { notificationId } = req.params;
    const result = yield notification_service_1.notificationServices.markNotificationAsRead(notificationId, req.user.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        message: 'Notification marked as read successfully',
        data: result,
    });
}));
// Get unread notification count for the logged-in user
const getUnreadNotificationCount = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield notification_service_1.notificationServices.getUnreadNotificationCount(req.user.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        message: 'Unread notification count retrieved successfully',
        data: result,
    });
}));
// Mark all notifications as read for the logged-in user
const markAllNotificationsAsRead = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield notification_service_1.notificationServices.markAllNotificationsAsRead(req.user.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        message: 'All notifications marked as read successfully',
        data: result,
    });
}));
exports.notificationsControllers = {
    getAllNotifications,
    getUsersByNotification,
    markNotificationAsRead,
    getUnreadNotificationCount,
    markAllNotificationsAsRead,
};
