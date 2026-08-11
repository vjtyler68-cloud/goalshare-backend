"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authValidation = void 0;
const zod_1 = __importDefault(require("zod"));
const loginUser = zod_1.default.object({
    body: zod_1.default.object({
        email: zod_1.default
            .string({
            required_error: 'Email is required!',
        })
            .email({
            message: 'Invalid email format!',
        }),
        password: zod_1.default.string({
            required_error: 'Password is required!',
        }),
    }),
});
const registerUser = zod_1.default.object({
    body: zod_1.default.object({
        firstName: zod_1.default.string({
            required_error: 'First Name is required!',
        }),
        lastName: zod_1.default.string({
            required_error: 'Last Name is required!',
        }),
        email: zod_1.default
            .string({
            required_error: 'Email is required!',
        })
            .email({
            message: 'Invalid email format!',
        }),
        password: zod_1.default.string({
            required_error: 'Password is required!',
        }),
    }),
});
const forgetPasswordValidationSchema = zod_1.default.object({
    body: zod_1.default.object({
        email: zod_1.default
            .string({ required_error: 'email is required' })
            .email({ message: 'Use a valid Email' }),
    }),
});
const verifyOtpValidationSchema = zod_1.default.object({
    body: zod_1.default.object({
        email: zod_1.default
            .string({ required_error: 'email is required' })
            .email({ message: 'Use a valid Email' }),
        otp: zod_1.default.string({ required_error: 'Otp is required.' }),
    }),
});
const verifyTokenValidationSchema = zod_1.default.object({
    body: zod_1.default.object({
        token: zod_1.default.string({ required_error: 'Token is required.' }),
    }),
});
const resetPasswordValidationSchema = zod_1.default.object({
    body: zod_1.default.object({
        email: zod_1.default
            .string({ required_error: 'User email is required!' })
            .trim()
            .email({ message: 'Use a valid Email' }),
        password: zod_1.default.string({ required_error: 'New Password is required!' }),
    }),
});
exports.authValidation = {
    loginUser,
    registerUser,
    forgetPasswordValidationSchema,
    verifyOtpValidationSchema,
    verifyTokenValidationSchema,
    resetPasswordValidationSchema,
};
