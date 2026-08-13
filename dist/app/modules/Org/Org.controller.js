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
exports.OrgControllers = void 0;
const http_status_1 = __importDefault(require("http-status"));
const catchAsync_1 = __importDefault(require("../../utils/catchAsync"));
const sendResponse_1 = __importDefault(require("../../utils/sendResponse"));
const Org_service_1 = require("./Org.service");
const createOrg = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Org_service_1.OrgServices.createOrg(req.user.id, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Organization created',
        data: result,
    });
}));
const joinOrg = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Org_service_1.OrgServices.joinOrg(req.user.id, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Joined organization',
        data: result,
    });
}));
const getMine = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Org_service_1.OrgServices.getMine(req.user.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'My organization',
        data: result,
    });
}));
const getMyOrgs = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Org_service_1.OrgServices.getMyOrgs(req.user.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'My organizations',
        data: result,
    });
}));
const getRoster = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Org_service_1.OrgServices.getRoster(req.user.id, req.params.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Org roster',
        data: result,
    });
}));
const pushSummary = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Org_service_1.OrgServices.pushSummary(req.user.id, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Summary saved',
        data: result,
    });
}));
const leaveOrg = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Org_service_1.OrgServices.leaveOrg(req.user.id, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Left organization',
        data: result,
    });
}));
const setMap = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Org_service_1.OrgServices.setMap(req.user.id, req.params.id, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Map saved',
        data: result,
    });
}));
const setBooking = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Org_service_1.OrgServices.setBooking(req.user.id, req.params.id, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Scheduler saved',
        data: result,
    });
}));
const getSpace = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Org_service_1.OrgServices.getSpace(req.user.id, req.params.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Team HQ',
        data: result,
    });
}));
const createPost = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Org_service_1.OrgServices.createPost(req.user.id, req.params.id, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Posted',
        data: result,
    });
}));
const toggleLike = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Org_service_1.OrgServices.toggleLike(req.user.id, req.params.postId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Updated',
        data: result,
    });
}));
const deletePost = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Org_service_1.OrgServices.deletePost(req.user.id, req.params.postId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Deleted',
        data: result,
    });
}));
const createGoal = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Org_service_1.OrgServices.createGoal(req.user.id, req.params.id, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Goal created',
        data: result,
    });
}));
const bumpGoal = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Org_service_1.OrgServices.bumpGoal(req.user.id, req.params.goalId, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Goal updated',
        data: result,
    });
}));
const deleteGoal = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Org_service_1.OrgServices.deleteGoal(req.user.id, req.params.goalId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Goal deleted',
        data: result,
    });
}));
const setMemberRole = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Org_service_1.OrgServices.setMemberRole(req.user.id, req.params.id, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Role updated',
        data: result,
    });
}));
const setTaskHub = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Org_service_1.OrgServices.setTaskHub(req.user.id, req.params.id, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Task Hub updated',
        data: result,
    });
}));
// ── Task Hub ──────────────────────────────────────────────────────────────
const listTasks = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Org_service_1.OrgServices.listTasks(req.user.id, req.params.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Tasks',
        data: result,
    });
}));
const createTask = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Org_service_1.OrgServices.createTask(req.user.id, req.params.id, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Task created',
        data: result,
    });
}));
const updateTask = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Org_service_1.OrgServices.updateTask(req.user.id, req.params.taskId, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Task updated',
        data: result,
    });
}));
const deleteTask = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Org_service_1.OrgServices.deleteTask(req.user.id, req.params.taskId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Task deleted',
        data: result,
    });
}));
const createProject = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Org_service_1.OrgServices.createProject(req.user.id, req.params.id, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Project created',
        data: result,
    });
}));
const deleteProject = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Org_service_1.OrgServices.deleteProject(req.user.id, req.params.projectId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Project deleted',
        data: result,
    });
}));
const listMeetings = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Org_service_1.OrgServices.listMeetings(req.user.id, req.params.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Meetings',
        data: result,
    });
}));
const createMeeting = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Org_service_1.OrgServices.createMeeting(req.user.id, req.params.id, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Meeting created',
        data: result,
    });
}));
const updateMeeting = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Org_service_1.OrgServices.updateMeeting(req.user.id, req.params.meetingId, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Meeting updated',
        data: result,
    });
}));
const deleteMeeting = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Org_service_1.OrgServices.deleteMeeting(req.user.id, req.params.meetingId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Meeting deleted',
        data: result,
    });
}));
exports.OrgControllers = {
    createOrg,
    joinOrg,
    getMine,
    getMyOrgs,
    getRoster,
    pushSummary,
    leaveOrg,
    setMap,
    setBooking,
    getSpace,
    createPost,
    toggleLike,
    deletePost,
    createGoal,
    bumpGoal,
    deleteGoal,
    setMemberRole,
    setTaskHub,
    listTasks,
    createTask,
    updateTask,
    deleteTask,
    createProject,
    deleteProject,
    listMeetings,
    createMeeting,
    updateMeeting,
    deleteMeeting,
};
