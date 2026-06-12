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
exports.GoalController = void 0;
const catchAsync_1 = __importDefault(require("../../utils/catchAsync"));
const http_status_1 = __importDefault(require("http-status"));
const sendResponse_1 = __importDefault(require("../../utils/sendResponse"));
const goal_service_1 = require("./goal.service");
// Goal
const createGoal = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const result = yield goal_service_1.GoalServices.createGoal(req, userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: 'Goal created successfully',
        data: result,
    });
}));
const getMyGoals = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const result = yield goal_service_1.GoalServices.getMyGoals(userId, req.query);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'My goals retrieved successfully',
        data: result,
    });
}));
const getGoalById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield goal_service_1.GoalServices.getGoalById(req.params.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Goal details retrieved successfully',
        data: result,
    });
}));
const updateGoal = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield goal_service_1.GoalServices.updateGoal(req.params.id, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Goal updated successfully',
        data: result,
    });
}));
const deleteGoal = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield goal_service_1.GoalServices.deleteGoal(req.params.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Goal deleted successfully',
        data: result,
    });
}));
const updateGoalStatus = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield goal_service_1.GoalServices.updateGoalStatus(req.params.id, req.body.status);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Goal status updated successfully',
        data: result,
    });
}));
const goalBreakTimeSpent = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield goal_service_1.GoalServices.goalBreakTimeSpent(req.params.goalId, req.body.breakTimeSpent);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Goal break time spent updated successfully',
        data: result,
    });
}));
// Client
const addClient = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield goal_service_1.GoalServices.addClient(req.params.goalId, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: 'Client added successfully',
        data: result,
    });
}));
const getAllClientsByGoal = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield goal_service_1.GoalServices.getAllClientsByGoalId(req.params.goalId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Client details retrieved successfully',
        data: result,
    });
}));
const getClientById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield goal_service_1.GoalServices.getClientById(req.params.clientId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Client details retrieved successfully',
        data: result,
    });
}));
const updateClient = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield goal_service_1.GoalServices.updateClient(req.params.clientId, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'client updated successfully',
        data: result,
    });
}));
const updateClientTimeSpent = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield goal_service_1.GoalServices.updateClientTimeSpent(req.params.clientId, req.body.timeSpent);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'client updated successfully',
        data: result,
    });
}));
const updateClientStatus = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield goal_service_1.GoalServices.updateClientStatus(req.params.clientId, req.body.status);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Client status updated successfully',
        data: result,
    });
}));
// MyWhy
const addMyWhy = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield goal_service_1.GoalServices.addMyWhy(req.params.goalId, req.body.text);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: 'MyWhy added successfully',
        data: result,
    });
}));
// Affirmation
const addAffirmation = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield goal_service_1.GoalServices.addAffirmation(req.params.goalId, req.body.text);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: 'Affirmation added successfully',
        data: result,
    });
}));
exports.GoalController = {
    createGoal,
    getMyGoals,
    getGoalById,
    updateGoal,
    deleteGoal,
    updateGoalStatus,
    goalBreakTimeSpent,
    addClient,
    getAllClientsByGoal,
    getClientById,
    updateClient,
    updateClientTimeSpent,
    updateClientStatus,
    addMyWhy,
    addAffirmation,
};
