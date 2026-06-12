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
exports.AssetController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const catchAsync_1 = __importDefault(require("../../utils/catchAsync"));
const sendResponse_1 = __importDefault(require("../../utils/sendResponse"));
const asset_service_1 = require("./asset.service");
const uploadAsset = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const file = req.file;
    const url = yield asset_service_1.AssetService.upload(file);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        message: 'File uploaded successfully',
        data: { url },
    });
}));
const uploadMultipleAssets = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const files = req.files;
    const urls = yield asset_service_1.AssetService.uploadMultiple(files);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        message: 'Files uploaded successfully',
        data: { urls },
    });
}));
const deleteAsset = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { path } = req.body;
    const success = yield asset_service_1.AssetService.delete(path);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        message: 'File deleted successfully',
        data: success
    });
}));
const deleteMultipleAssets = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { paths } = req.body;
    const deleted = yield asset_service_1.AssetService.deleteMultiple(paths);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        message: 'Files deleted successfully',
        data: { deleted },
    });
}));
const updateAsset = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { oldPath } = req.body;
    const file = req.file;
    const newUrl = yield asset_service_1.AssetService.update(oldPath, file);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        message: 'File updated successfully',
        data: { url: newUrl },
    });
}));
const updateMultipleAssets = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { oldPaths } = req.body;
    const files = req.files;
    const { saved: urls } = yield asset_service_1.AssetService.updateMultipleAsset(oldPaths, files);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        message: 'Files updated successfully',
        data: { urls },
    });
}));
exports.AssetController = {
    uploadAsset,
    uploadMultipleAssets,
    deleteAsset,
    deleteMultipleAssets,
    updateAsset,
    updateMultipleAssets,
};
