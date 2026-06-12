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
exports.PaymentController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const catchAsync_1 = __importDefault(require("../../utils/catchAsync"));
const sendResponse_1 = __importDefault(require("../../utils/sendResponse"));
const payment_service_1 = require("./payment.service");
const getAllForAdmin = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield payment_service_1.PaymentService.getAllPayments(req.query);
    (0, sendResponse_1.default)(res, Object.assign({ statusCode: http_status_1.default.OK, success: true, message: 'All payments retrieved successfully (Admin)' }, result));
}));
const getAllForUser = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const query = Object.assign(Object.assign({}, req.query), { userId });
    const result = yield payment_service_1.PaymentService.getAllPayments(query);
    (0, sendResponse_1.default)(res, Object.assign({ statusCode: http_status_1.default.OK, success: true, message: 'All payments retrieved successfully (User)' }, result));
}));
const getSingleForAdmin = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield payment_service_1.PaymentService.singleTransactionHistory({ id });
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Single payment retrieved successfully (Admin)',
        data: result,
    });
}));
const getSingleForUser = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const result = yield payment_service_1.PaymentService.singleTransactionHistory({ id, userId });
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Single payment retrieved successfully (User)',
        data: result,
    });
}));
const singleTransactionHistoryBySessionId = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { stripeSessionId } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const result = yield payment_service_1.PaymentService.singleTransactionHistoryBySessionId({ stripeSessionId, userId });
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Single payment retrieved successfully (User)',
        data: result,
    });
}));
const cancelPayment = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const role = req.user.role;
    const result = yield payment_service_1.PaymentService.cancelPayment(id, userId, role);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Payment Cancel Successfully',
        data: result,
    });
}));
exports.PaymentController = {
    getAllForAdmin,
    getAllForUser,
    getSingleForAdmin,
    getSingleForUser,
    cancelPayment,
    singleTransactionHistoryBySessionId
};
