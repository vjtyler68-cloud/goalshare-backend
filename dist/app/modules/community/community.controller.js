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
exports.CommunityController = void 0;
const catchAsync_1 = __importDefault(require("../../utils/catchAsync"));
const http_status_1 = __importDefault(require("http-status"));
const sendResponse_1 = __importDefault(require("../../utils/sendResponse"));
const community_service_1 = require("./community.service");
const createIntoDb = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const file = req.file;
    const result = yield community_service_1.CommunityServices.createIntoDb(userId, file, req);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: 'Successfully created community',
        data: result,
    });
}));
const getAllCommunity = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield community_service_1.CommunityServices.getAllCommunity(req.query);
    (0, sendResponse_1.default)(res, Object.assign({ statusCode: http_status_1.default.OK, success: true, message: 'Successfully retrieved all community' }, result));
}));
const getAllUsersForCommunityDB = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield community_service_1.CommunityServices.getAllUsersForCommunityDB(req.query);
    (0, sendResponse_1.default)(res, Object.assign({ statusCode: http_status_1.default.OK, message: 'Users retrieved successfully' }, result));
}));
const getCommunityById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield community_service_1.CommunityServices.getCommunityByIdFromDB(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Successfully retrieved community by id',
        data: result,
    });
}));
const getMyCommunities = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const result = yield community_service_1.CommunityServices.getMyCommunities(userId, req.query);
    (0, sendResponse_1.default)(res, Object.assign({ statusCode: http_status_1.default.OK, success: true, message: 'Successfully retrieved communities created by the user' }, result));
}));
const updateIntoDb = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield community_service_1.CommunityServices.updateIntoDb(id, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Successfully updated community',
        data: result,
    });
}));
const deleteIntoDb = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield community_service_1.CommunityServices.deleteIntoDb(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Successfully deleted community',
        data: result,
    });
}));
exports.CommunityController = {
    createIntoDb,
    getAllCommunity,
    getCommunityById,
    updateIntoDb,
    deleteIntoDb,
    getMyCommunities,
    getAllUsersForCommunityDB,
};
