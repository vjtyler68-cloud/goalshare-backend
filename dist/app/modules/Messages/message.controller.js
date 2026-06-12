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
exports.MessageControllers = void 0;
const http_status_1 = __importDefault(require("http-status"));
const catchAsync_1 = __importDefault(require("../../utils/catchAsync"));
const sendResponse_1 = __importDefault(require("../../utils/sendResponse"));
const message_service_1 = require("./message.service");
// Send message controller
const sendMessage = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const senderId = req.user.id;
    const result = yield message_service_1.MessageServices.sendMessage(senderId, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        message: 'Message sent successfully',
        data: result,
    });
}));
// Get conversation between two users
const getConversation = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const me = req.user.id;
    const other = req.params.id;
    const result = yield message_service_1.MessageServices.getConversation(me, other);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        message: 'Conversation fetched successfully',
        data: result,
    });
}));
const getAllConversationUsers = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const me = req.user.id;
    const result = yield message_service_1.MessageServices.getAllConversationUsers(me);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        message: 'Conversation list fetched successfully',
        data: result,
    });
}));
// Mark message as read
const markMessageAsRead = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { messageId } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // assuming you have user from auth middleware
    const result = yield message_service_1.MessageServices.markMessageAsRead(messageId, userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        message: 'Message marked as read',
        data: result,
    });
}));
// Delete message
const deleteMessage = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { messageId } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const result = yield message_service_1.MessageServices.deleteMessage(messageId, userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        message: 'Message deleted successfully',
        data: result,
    });
}));
exports.MessageControllers = {
    sendMessage,
    getConversation,
    markMessageAsRead,
    deleteMessage,
    getAllConversationUsers
};
