"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileUploader = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const storage = multer_1.default.memoryStorage();
exports.upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        // 100 MB in bytes
        fileSize: 100 * 1024 * 1024,
    },
});
// upload single image
const uploadSingle = exports.upload.single('image');
// upload multiple image
const uploadMultiple = exports.upload.fields([
    { name: 'singleImage', maxCount: 1 },
    { name: 'multipleImage', maxCount: 10 },
]);
exports.fileUploader = {
    upload: exports.upload,
    uploadSingle,
    uploadMultiple,
};
