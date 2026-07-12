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
exports.GlobalController = void 0;
const catchAsync_1 = __importDefault(require("../../utils/catchAsync"));
const http_status_1 = __importDefault(require("http-status"));
const sendResponse_1 = __importDefault(require("../../utils/sendResponse"));
const Global_service_1 = require("./Global.service");
// MyWhy Controllers
const createMyWhy = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Global_service_1.GlobalServices.createMyWhy(req);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: 'Successfully created MyWhy',
        data: result,
    });
}));
const getMyMyWhy = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Global_service_1.GlobalServices.getAllMyWhy(req.user.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Successfully retrieved all MyWhy',
        data: result,
    });
}));
const getMyWhyById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield Global_service_1.GlobalServices.getMyWhyById(req.user.id, id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Successfully retrieved MyWhy by id',
        data: result,
    });
}));
const updateMyWhy = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const result = yield Global_service_1.GlobalServices.updateMyWhy(req.user.id, id, (_a = req.body) === null || _a === void 0 ? void 0 : _a.text);
    (0, sendResponse_1.default)(res, {
        statusCode: result ? http_status_1.default.OK : http_status_1.default.NOT_FOUND,
        success: !!result,
        message: result ? 'Successfully updated MyWhy' : 'MyWhy not found or empty text',
        data: result,
    });
}));
const deleteMyWhy = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield Global_service_1.GlobalServices.deleteMyWhy(req.user.id, id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Successfully deleted MyWhy',
        data: result,
    });
}));
// Affirmation Controllers
const createAffirmation = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Global_service_1.GlobalServices.createAffirmation(req);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: 'Successfully created Affirmation',
        data: result,
    });
}));
const getMyAffirmation = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Global_service_1.GlobalServices.getAllAffirmation(req.user.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Successfully retrieved all Affirmation',
        data: result,
    });
}));
const getAffirmationById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield Global_service_1.GlobalServices.getAffirmationById(req.user.id, id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Successfully retrieved Affirmation by id',
        data: result,
    });
}));
const updateAffirmation = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const result = yield Global_service_1.GlobalServices.updateAffirmation(req.user.id, id, (_a = req.body) === null || _a === void 0 ? void 0 : _a.text);
    (0, sendResponse_1.default)(res, {
        statusCode: result ? http_status_1.default.OK : http_status_1.default.NOT_FOUND,
        success: !!result,
        message: result ? 'Successfully updated Affirmation' : 'Affirmation not found or empty text',
        data: result,
    });
}));
const deleteAffirmation = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield Global_service_1.GlobalServices.deleteAffirmation(req.user.id, id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Successfully deleted Affirmation',
        data: result,
    });
}));
exports.GlobalController = {
    // MyWhy
    createMyWhy,
    getMyMyWhy,
    getMyWhyById,
    updateMyWhy,
    deleteMyWhy,
    // Affirmation
    createAffirmation,
    getMyAffirmation,
    getAffirmationById,
    updateAffirmation,
    deleteAffirmation,
};
