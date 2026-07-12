"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataController = void 0;
const catchAsync_1 = __importDefault(require("../../utils/catchAsync"));
const http_status_1 = __importDefault(require("http-status"));
const sendResponse_1 = __importDefault(require("../../utils/sendResponse"));
const Data_service_1 = require("./Data.service");

const exportMyData = (0, catchAsync_1.default)(async (req, res) => {
    const result = await Data_service_1.DataServices.exportMyData(req.user.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Successfully exported your data',
        data: result,
    });
});

const reportCrash = (0, catchAsync_1.default)(async (req, res) => {
    var _a;
    // Best-effort user attribution: /data/crash is unauthenticated (crashes can
    // happen pre-login), but the app sends a userId hint when it has one.
    const result = await Data_service_1.DataServices.reportCrash(req.body, typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.userId) === 'string' ? req.body.userId : '');
    (0, sendResponse_1.default)(res, {
        statusCode: result ? http_status_1.default.CREATED : http_status_1.default.BAD_REQUEST,
        success: !!result,
        message: result ? 'Crash report received' : 'error field is required',
        data: result,
    });
});

exports.DataController = {
    exportMyData,
    reportCrash,
};
