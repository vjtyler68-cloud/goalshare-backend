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
exports.verifyOtp = void 0;
const http_status_1 = __importDefault(require("http-status"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const prisma_1 = require("./prisma");
const verifyOtp = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const userData = yield prisma_1.prisma.user.findFirst({
        where: {
            email: payload.email,
        },
        select: {
            otp: true,
            otpExpiry: true,
            id: true,
            fullName: true,
            email: true,
            role: true,
        },
    });
    if (!userData) {
        throw new AppError_1.default(401, 'User not found');
    }
    if (!userData.otp || !userData.otpExpiry) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'No OTP request found for this email.');
    }
    if (new Date(userData.otpExpiry).getTime() < Date.now()) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'OTP has expired. Please request a new one.');
    }
    if (userData.otp !== payload.otp) {
        throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, 'Invalid OTP. Please try again.');
    }
    return {
        verified: true,
        userData,
    };
});
exports.verifyOtp = verifyOtp;
