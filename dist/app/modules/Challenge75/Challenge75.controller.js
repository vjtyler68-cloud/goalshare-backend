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
exports.Challenge75Controllers = void 0;
const http_status_1 = __importDefault(require("http-status"));
const catchAsync_1 = __importDefault(require("../../utils/catchAsync"));
const sendResponse_1 = __importDefault(require("../../utils/sendResponse"));
const Challenge75_service_1 = require("./Challenge75.service");
const createCrew = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Challenge75_service_1.Challenge75Services.createCrew(req.user.id, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Crew created',
        data: result,
    });
}));
const joinCrew = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Challenge75_service_1.Challenge75Services.joinCrew(req.user.id, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Joined crew',
        data: result,
    });
}));
const leaveCrew = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Challenge75_service_1.Challenge75Services.leaveCrew(req.user.id, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Left crew',
        data: result,
    });
}));
const pushProgress = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Challenge75_service_1.Challenge75Services.pushProgress(req.user.id, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Progress synced',
        data: result,
    });
}));
const listMembers = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Challenge75_service_1.Challenge75Services.listMembers(req.user.id, req.params.code);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Crew members',
        data: result,
    });
}));
exports.Challenge75Controllers = {
    createCrew,
    joinCrew,
    leaveCrew,
    pushProgress,
    listMembers,
};
