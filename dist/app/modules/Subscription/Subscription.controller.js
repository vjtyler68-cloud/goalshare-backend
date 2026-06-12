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
exports.SubscriptionController = void 0;
const catchAsync_1 = __importDefault(require("../../utils/catchAsync"));
const http_status_1 = __importDefault(require("http-status"));
const sendResponse_1 = __importDefault(require("../../utils/sendResponse"));
const Subscription_service_1 = require("./Subscription.service");
const createIntoDb = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Subscription_service_1.SubscriptionServices.createIntoDb(req);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: 'Successfully created Subscription',
        data: result,
    });
}));
const getAllSubscription = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Subscription_service_1.SubscriptionServices.getAllSubscription();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Successfully retrieved all Subscription',
        data: result,
    });
}));
const assignSubscription = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const result = yield Subscription_service_1.SubscriptionServices.assignSubscriptionToUser(userId, req.body);
    return (0, sendResponse_1.default)(res, {
        statusCode: 200,
        success: true,
        // message: result.message,
        data: result,
    });
}));
const verifySubscription = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Subscription_service_1.SubscriptionServices.verifyToken(req);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Verify token ',
        data: result,
    });
}));
const getMySubscription = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Subscription_service_1.SubscriptionServices.getMySubscription(req);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Successfully retrieved my Subscription ',
        data: result,
    });
}));
const updateInAppPlan = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Subscription_service_1.SubscriptionServices.updateInAppPurchasePlanData(req);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Successfully buy my Subscription ',
        data: result,
    });
}));
const getSubscriptionById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield Subscription_service_1.SubscriptionServices.getSubscriptionByIdFromDB(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Successfully retrieved Subscription by id',
        data: result,
    });
}));
const updateIntoDb = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield Subscription_service_1.SubscriptionServices.updateIntoDb(id, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Successfully updated Subscription',
        data: result,
    });
}));
const deleteIntoDb = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield Subscription_service_1.SubscriptionServices.deleteIntoDb(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Successfully deleted Subscription',
        data: result,
    });
}));
const deleteMySubscription = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    console.log('user', userId);
    const result = yield Subscription_service_1.SubscriptionServices.deleteMySubscription(userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Your subscription has been successfully deleted',
        data: result,
    });
}));
exports.SubscriptionController = {
    createIntoDb,
    getAllSubscription,
    assignSubscription,
    getSubscriptionById,
    updateIntoDb,
    deleteIntoDb,
    getMySubscription,
    deleteMySubscription,
    updateInAppPlan,
    verifySubscription,
};
