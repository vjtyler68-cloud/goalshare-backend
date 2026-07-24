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
exports.UserControllers = void 0;
const http_status_1 = __importDefault(require("http-status"));
const catchAsync_1 = __importDefault(require("../../utils/catchAsync"));
const sendResponse_1 = __importDefault(require("../../utils/sendResponse"));
const user_service_1 = require("./user.service");
const getAllUsers = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield user_service_1.UserServices.getAllUsersFromDB(req.query);
    (0, sendResponse_1.default)(res, Object.assign({ statusCode: http_status_1.default.OK, message: 'Users retrieved successfully' }, result));
}));
const getUnapprovedUsers = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const result = yield user_service_1.UserServices.getAllUnApproveUser(pageNum, limitNum);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Unapproved users fetched successfully',
        data: result.data,
        meta: result.meta,
    });
}));
const getMyProfile = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.user.id;
    const result = yield user_service_1.UserServices.getMyProfileFromDB(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        message: 'Profile retrieved successfully',
        data: result,
    });
}));
const getUserDetails = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield user_service_1.UserServices.getUserDetailsFromDB(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        message: 'User details retrieved successfully',
        data: result,
    });
}));
// Update profile fields
const updateMyProfile = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.user.id;
    const payload = req.body;
    const result = yield user_service_1.UserServices.updateMyProfileIntoDB(id, payload);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        message: 'User profile updated successfully',
        data: result,
    });
}));
// Update profile image
const updateProfileImage = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.user.id;
    const file = req.file;
    const previousImg = req.user.profile || '';
    const result = yield user_service_1.UserServices.updateProfileImg(id, previousImg, req, file);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        message: 'Profile image updated successfully',
        data: result,
    });
}));
const updateUserRoleStatus = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const role = req.body.role;
    const result = yield user_service_1.UserServices.updateUserRoleStatusIntoDB(id, role);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        message: 'User role updated successfully',
        data: result,
    });
}));
const updateUserStatus = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const status = req.body.status;
    const result = yield user_service_1.UserServices.updateUserStatus(id, status);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        message: 'User status updated successfully',
        data: result,
    });
}));
const updateUserApproval = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.body;
    const result = yield user_service_1.UserServices.updateUserApproval(userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        message: 'User approved successfully',
        data: result,
    });
}));
const softDeleteUser = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.user.id;
    const result = yield user_service_1.UserServices.softDeleteUserIntoDB(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        message: 'User soft deleted successfully',
        data: result,
    });
}));
const hardDeleteUser = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const { id } = req.params;
    const result = yield user_service_1.UserServices.hardDeleteUserIntoDB(id, userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        message: 'User soft deleted successfully',
        data: result,
    });
}));
const updateUser = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    const result = yield user_service_1.UserServices.updateUserIntoDb(req, id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'User updated successfully!',
        data: result,
    });
}));
// PUT /user/fcm-token { token, platform } — register this device for push.
const setFcmToken = (0, catchAsync_1.default)(async (req, res) => {
    const id = req.user.id;
    const token = ((req.body && req.body.token) || '').toString();
    if (token) {
        await user_service_1.UserServices.updateFcmToken(id, token);
    }
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Token registered',
        data: null,
    });
});
exports.UserControllers = {
    setFcmToken,
    getAllUsers,
    getMyProfile,
    getUserDetails,
    updateMyProfile,
    getUnapprovedUsers,
    updateUserRoleStatus,
    updateUserStatus,
    updateUserApproval,
    softDeleteUser,
    hardDeleteUser,
    updateUser,
    updateProfileImage,
};
