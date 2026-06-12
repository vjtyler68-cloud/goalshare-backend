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
exports.AssetService = void 0;
const http_status_1 = __importDefault(require("http-status"));
const uploadFiles_1 = require("../../utils/uploadFiles");
const AppError_1 = __importDefault(require("../../errors/AppError"));
const uploadAsset = (file) => __awaiter(void 0, void 0, void 0, function* () {
    if (!file) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Provide at least one asset');
    }
    const location = (0, uploadFiles_1.uploadSingleFile)(file);
    return location;
});
const uploadMultipleAssets = (files) => __awaiter(void 0, void 0, void 0, function* () {
    if (!files || files.length === 0) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Provide at least one asset');
    }
    console.log(files);
    const locations = (0, uploadFiles_1.uploadFiles)(files);
    return locations;
});
const deleteAsset = (path) => __awaiter(void 0, void 0, void 0, function* () {
    const success = (0, uploadFiles_1.deleteFile)(path);
    return success;
});
const deleteMultipleAssets = (paths) => __awaiter(void 0, void 0, void 0, function* () {
    const deleted = (0, uploadFiles_1.deleteFiles)(paths);
    return deleted;
});
const updateAsset = (oldPath, newFile) => __awaiter(void 0, void 0, void 0, function* () {
    if (!newFile) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Provide a new file to update the asset');
    }
    const newLocation = (0, uploadFiles_1.updateSingleFile)(oldPath, newFile);
    return newLocation;
});
const updateMultipleAsset = (oldPaths, newFiles) => __awaiter(void 0, void 0, void 0, function* () {
    if (!newFiles || newFiles.length === 0) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Provide new files to update the assets');
    }
    const newLocations = (0, uploadFiles_1.updateFiles)(oldPaths, newFiles);
    return newLocations;
});
exports.AssetService = {
    upload: uploadAsset,
    uploadMultiple: uploadMultipleAssets,
    delete: deleteAsset,
    deleteMultiple: deleteMultipleAssets,
    update: updateAsset,
    updateMultipleAsset,
};
