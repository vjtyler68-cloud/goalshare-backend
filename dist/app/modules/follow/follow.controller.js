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
exports.FollowController = void 0;
const catchAsync_1 = __importDefault(require("../../utils/catchAsync"));
const sendResponse_1 = __importDefault(require("../../utils/sendResponse"));
const http_status_1 = __importDefault(require("http-status"));
const follow_service_1 = require("./follow.service");
const followUser = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const followerId = req.user.id;
    const { followingId } = req.body;
    const result = yield follow_service_1.FollowServices.followUser(followerId, followingId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: `Successfully followed ${(_a = result === null || result === void 0 ? void 0 : result.following) === null || _a === void 0 ? void 0 : _a.fullName}`,
        data: result,
    });
}));
const unfollowUser = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const followerId = req.user.id;
    const { followingId } = req.body;
    const result = yield follow_service_1.FollowServices.unfollowUser(followerId, followingId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: `Successfully unfollowed ${(_a = result === null || result === void 0 ? void 0 : result.following) === null || _a === void 0 ? void 0 : _a.fullName}`,
        data: result,
    });
}));
const getFollowers = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    const followers = yield follow_service_1.FollowServices.getFollowers(userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Followers retrieved successfully',
        data: followers,
    });
}));
const getFollowing = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    const following = yield follow_service_1.FollowServices.getFollowing(userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Following retrieved successfully',
        data: following,
    });
}));
const getFollowCountsController = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    const counts = yield follow_service_1.FollowServices.getFollowCounts(userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Follow counts retrieved successfully',
        data: counts,
    });
}));
const getMyFollowCountsController = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const counts = yield follow_service_1.FollowServices.getMyFollowCounts(userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Your follow counts retrieved successfully',
        data: counts,
    });
}));
const getMyFollowerFollowingList = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const searchQuery = req.query.search || '';
    const { users } = yield follow_service_1.FollowServices.getMyFollowerFollowingList(userId, searchQuery);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Your follower and following counts retrieved successfully',
        data: users,
        // data: { users },
    });
}));
exports.FollowController = {
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    getFollowCountsController,
    getMyFollowCountsController,
    getMyFollowerFollowingList,
};
