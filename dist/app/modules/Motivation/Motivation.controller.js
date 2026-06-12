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
exports.MotivationController = void 0;
const catchAsync_1 = __importDefault(require("../../utils/catchAsync"));
const http_status_1 = __importDefault(require("http-status"));
const sendResponse_1 = __importDefault(require("../../utils/sendResponse"));
const Motivation_service_1 = require("./Motivation.service");
const createIntoDb = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const file = req.file;
    const title = JSON.parse(req.body.data);
    const result = yield Motivation_service_1.MotivationServices.createIntoDb(userId, file, title.title);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: 'Successfully created Motivation',
        data: result,
    });
}));
const getAllMotivation = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Motivation_service_1.MotivationServices.getAllMotivation(req.query);
    (0, sendResponse_1.default)(res, Object.assign({ statusCode: http_status_1.default.OK, success: true, message: 'Successfully retrieved all Motivation' }, result));
}));
const getMotivationById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield Motivation_service_1.MotivationServices.getMotivationByIdFromDB(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Successfully retrieved Motivation by id',
        data: result,
    });
}));
const getMyMotivation = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const result = yield Motivation_service_1.MotivationServices.getMyMotivation(userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Successfully retrieved Motivation by id',
        data: result,
    });
}));
const updateIntoDb = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const file = req.file;
    const bodyData = ((_a = req.body) === null || _a === void 0 ? void 0 : _a.data) ? JSON.parse(req.body.data) : req.body;
    const result = yield Motivation_service_1.MotivationServices.updateIntoDb(id, bodyData, file);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Successfully updated Motivation',
        data: result,
    });
}));
const deleteIntoDb = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield Motivation_service_1.MotivationServices.deleteIntoDb(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Successfully deleted Motivation',
        data: result,
    });
}));
exports.MotivationController = {
    createIntoDb,
    getAllMotivation,
    getMotivationById,
    getMyMotivation,
    updateIntoDb,
    deleteIntoDb,
};
