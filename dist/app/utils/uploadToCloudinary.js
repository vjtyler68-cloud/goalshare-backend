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
exports.uploadToCloudinary = void 0;
const cloudinary_1 = require("cloudinary");
const streamifier_1 = __importDefault(require("streamifier"));
// Configure Cloudinary
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
// ✅ Fixed Cloudinary Upload (Now supports buffer)
const uploadToCloudinary = (file) => __awaiter(void 0, void 0, void 0, function* () {
    if (!file) {
        throw new Error('File is required for uploading.');
    }
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary_1.v2.uploader.upload_stream({
            folder: 'uploads',
            resource_type: 'auto', // Supports images, videos, etc.
            use_filename: true,
            unique_filename: false,
        }, (error, result) => {
            if (error) {
                console.error('Error uploading file to Cloudinary:', error);
                return reject(error);
            }
            // ✅ Explicitly return `Location` and `public_id`
            resolve({
                Location: (result === null || result === void 0 ? void 0 : result.secure_url) || '', // Cloudinary URL
                public_id: (result === null || result === void 0 ? void 0 : result.public_id) || '',
            });
        });
        // Convert buffer to stream and upload
        streamifier_1.default.createReadStream(file.buffer).pipe(uploadStream);
    });
});
exports.uploadToCloudinary = uploadToCloudinary;
