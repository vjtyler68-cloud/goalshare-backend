"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateFiles = exports.updateSingleFile = exports.deleteFiles = exports.uploadFiles = exports.uploadSingleFile = exports.deleteFile = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("../../config"));
const baseUploadDir = path_1.default.join(__dirname, '..', 'upload');
const nodeEnv = config_1.default.env;
const getSubFolder = (mimetype) => {
    if (mimetype.startsWith('image/'))
        return 'images';
    if (mimetype.startsWith('video/'))
        return 'videos';
    if (mimetype === 'application/pdf')
        return 'pdfs';
    if (mimetype === 'application/msword' ||
        mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        return 'docs';
    return 'others';
};
const normalizePath = (filePath) => filePath.replace(/\\/g, '/');
const ensureDirectoryExists = (dirPath) => {
    if (!fs_1.default.existsSync(dirPath)) {
        fs_1.default.mkdirSync(dirPath, { recursive: true });
    }
};
const deleteFile = (relPath) => {
    const filePath = path_1.default.join(__dirname, '..', relPath);
    if (fs_1.default.existsSync(filePath)) {
        fs_1.default.unlinkSync(filePath);
        return true;
    }
    return false;
};
exports.deleteFile = deleteFile;
const uploadSingleFile = (file) => {
    const subFolder = getSubFolder(file.mimetype);
    const folderPath = path_1.default.join(baseUploadDir, subFolder);
    const filename = Date.now() + '-' + Math.round(Math.random() * 1e9) + path_1.default.extname(file.originalname);
    ensureDirectoryExists(folderPath);
    const filePath = path_1.default.join(folderPath, filename);
    fs_1.default.writeFileSync(filePath, file.buffer);
    const relPath = path_1.default.join('upload', subFolder, filename);
    return {
        name: file.originalname,
        url: `/${normalizePath(relPath)}`
    };
};
exports.uploadSingleFile = uploadSingleFile;
const uploadFiles = (files) => {
    const keptFiles = [];
    for (const file of files) {
        const url = (0, exports.uploadSingleFile)(file);
        keptFiles.push(url);
    }
    return keptFiles;
};
exports.uploadFiles = uploadFiles;
const deleteFiles = (filePaths) => {
    return filePaths.filter(relPath => (0, exports.deleteFile)(relPath));
};
exports.deleteFiles = deleteFiles;
const updateSingleFile = (oldFilePath, newFile) => {
    (0, exports.deleteFile)(oldFilePath);
    return (0, exports.uploadSingleFile)(newFile);
};
exports.updateSingleFile = updateSingleFile;
const updateFiles = (oldPaths, newFiles) => {
    const deleted = (0, exports.deleteFiles)(oldPaths);
    const saved = (0, exports.uploadFiles)(newFiles);
    return { deleted, saved };
};
exports.updateFiles = updateFiles;
