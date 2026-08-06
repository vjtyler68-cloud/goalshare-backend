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
exports.AccountabilityControllers = void 0;
const http_status_1 = __importDefault(require("http-status"));
const catchAsync_1 = __importDefault(require("../../utils/catchAsync"));
const sendResponse_1 = __importDefault(require("../../utils/sendResponse"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Accountability_service_1 = require("./Accountability.service");
const upsertProfile = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Accountability_service_1.AccountabilityServices.upsertProfile(req.user.id, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Buddy profile saved',
        data: result,
    });
}));
const getMyProfile = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Accountability_service_1.AccountabilityServices.getMyProfile(req.user.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Buddy profile',
        data: result,
    });
}));
const setOptIn = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Accountability_service_1.AccountabilityServices.setOptIn(req.user.id, ((_a = req.body) === null || _a === void 0 ? void 0 : _a.optedIn) === true);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Opt-in updated',
        data: result,
    });
}));
const createFriendMatch = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Accountability_service_1.AccountabilityServices.createFriendMatch(req.user.id, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Buddy matched',
        data: result,
    });
}));
const getCurrentMatch = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Accountability_service_1.AccountabilityServices.getCurrentMatch(req.user.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Current match',
        data: result,
    });
}));
const logCheckIn = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Accountability_service_1.AccountabilityServices.logCheckIn(req.user.id, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Checked in',
        data: result,
    });
}));
const verifyProof = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Accountability_service_1.AccountabilityServices.verifyProof(req.user.id, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Proof reviewed',
        data: result,
    });
}));
const getCheckins = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Accountability_service_1.AccountabilityServices.getCheckins(req.user.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Check-ins',
        data: result,
    });
}));
const sendVoice = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Accountability_service_1.AccountabilityServices.sendVoice(req.user.id, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Voice sent',
        data: result,
    });
}));
const getVoiceMessages = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Accountability_service_1.AccountabilityServices.getVoiceMessages(req.user.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Voice messages',
        data: result,
    });
}));
const postStatus = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Accountability_service_1.AccountabilityServices.postStatus(req.user.id, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Status shared',
        data: result,
    });
}));
const getStatuses = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Accountability_service_1.AccountabilityServices.getStatuses(req.user.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Status updates',
        data: result,
    });
}));
const setGoals = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Accountability_service_1.AccountabilityServices.setGoals(req.user.id, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Goals shared',
        data: result,
    });
}));
const getBuddyGoals = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Accountability_service_1.AccountabilityServices.getBuddyGoals(req.user.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Buddy goals',
        data: result,
    });
}));
const requestExtend = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Accountability_service_1.AccountabilityServices.requestExtend(req.user.id, ((_a = req.body) === null || _a === void 0 ? void 0 : _a.value) === true);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Extend preference updated',
        data: result,
    });
}));
const submitRating = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const result = yield Accountability_service_1.AccountabilityServices.submitRating(req.user.id, Number((_a = req.body) === null || _a === void 0 ? void 0 : _a.stars), ((_c = (_b = req.body) === null || _b === void 0 ? void 0 : _b.comment) !== null && _c !== void 0 ? _c : '').toString());
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Rating submitted',
        data: result,
    });
}));
/** Scheduler-only. Guarded by a shared secret so it isn't user-callable. */
const runWeeklyPairing = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const secret = process.env.CRON_SECRET;
    const provided = ((_a = req.headers['x-cron-secret']) !== null && _a !== void 0 ? _a : '').toString();
    if (!secret || provided !== secret) {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, 'Forbidden');
    }
    const result = yield Accountability_service_1.AccountabilityServices.runWeeklyPairing();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Weekly pairing complete',
        data: result,
    });
}));
exports.AccountabilityControllers = {
    createFriendMatch,
    upsertProfile,
    getMyProfile,
    setOptIn,
    getCurrentMatch,
    logCheckIn,
    verifyProof,
    getCheckins,
    sendVoice,
    getVoiceMessages,
    postStatus,
    getStatuses,
    setGoals,
    getBuddyGoals,
    requestExtend,
    submitRating,
    runWeeklyPairing,
};
