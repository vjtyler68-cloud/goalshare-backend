"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.AuthServices = void 0;
const bcrypt = __importStar(require("bcrypt"));
const http_status_1 = __importDefault(require("http-status"));
const config_1 = __importDefault(require("../../../config"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const client_1 = require("@prisma/client");
const sendMail_1 = require("../../utils/sendMail");
const otp_1 = require("../../utils/otp");
const verifyOtp_1 = require("../../utils/verifyOtp");
const sendResponse_1 = __importDefault(require("../../utils/sendResponse"));
const generateToken_1 = require("../../utils/generateToken");
const prisma_1 = require("../../utils/prisma");
const spainxOtp_1 = __importStar(require("../../utils/spainxOtp"));
const createFirebaseLogin = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Check if the user already exists
    const userData = yield prisma_1.prisma.user.findUnique({
        where: {
            email: payload.email,
        },
    });
    if (!userData) {
        // Create a new user if it doesn't exist
        const newUser = yield prisma_1.prisma.user.create({
            data: {
                fullName: payload.fullName || '',
                profile: payload.profile || '',
                email: payload.email,
                password: payload.password || '',
                fcmToken: (_a = payload.fcmToken) !== null && _a !== void 0 ? _a : null,
                isEmailVerified: true,
                isAgreeWithTerms: true,
                status: client_1.UserStatus.ACTIVE,
            },
            select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                isEmailVerified: true,
                status: true,
            },
        });
        // Generate a JWT access token for the new user
        const accessToken = yield (0, generateToken_1.generateToken)({
            id: newUser.id,
            name: newUser.fullName,
            email: newUser.email,
            role: newUser.role,
        }, config_1.default.jwt.access_secret, config_1.default.jwt.access_expires_in);
        return { user: newUser, accessToken };
    }
    // If the user exists, update the FCM token
    const updatedUser = yield prisma_1.prisma.user.update({
        where: { email: payload.email },
        data: {
            fcmToken: payload.fcmToken,
        },
        select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
        },
    });
    const accessToken = yield (0, generateToken_1.generateToken)({
        id: updatedUser.id,
        name: updatedUser.fullName,
        email: updatedUser.email,
        role: updatedUser.role,
    }, config_1.default.jwt.access_secret, config_1.default.jwt.access_expires_in);
    return { user: updatedUser, accessToken };
});
const loginWithOtpFromDB = (res, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const userData = yield prisma_1.insecurePrisma.user.findUnique({
        where: {
            email: payload.email,
        },
    });
    if (!userData) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'user not found');
    }
    const isCorrectPassword = yield bcrypt.compare(payload.password, userData === null || userData === void 0 ? void 0 : userData.password);
    if (!isCorrectPassword) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Password incorrect');
    }
    //  if (!userData.isApproved) {
    //    throw new AppError(
    //      httpStatus.UNAUTHORIZED,
    //      'You are not approved by admin!',
    //    );
    //  }
    if (userData.isDeleted) {
        throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, 'You are deleted !');
    }
    if (userData.role !== client_1.UserRoleEnum.ADMIN &&
        !userData.isEmailVerified &&
        // Test mode: treat everyone as verified so testers log in directly.
        !(0, otp_1.isTestOtpMode)()) {
        const otp = Math.floor(100000 + Math.random() * 900000);
        yield prisma_1.prisma.user.update({
            where: { email: userData.email },
            data: {
                otp: otp.toString(),
                otpExpiry: (0, otp_1.otpExpiryTime)(),
            },
        });
        const html = (0, spainxOtp_1.generateOtpEmail)(otp);
        yield (0, spainxOtp_1.default)(payload.email, html, 'OTP Verification');
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.OK,
            message: ' Please check your email for the verification OTP.',
            data: '',
        });
    }
    else {
        const accessToken = yield (0, generateToken_1.generateToken)({
            id: userData.id,
            name: userData.fullName,
            email: userData.email,
            role: userData.role,
        }, config_1.default.jwt.access_secret, config_1.default.jwt.access_expires_in);
        return {
            id: userData.id,
            name: userData.fullName,
            email: userData.email,
            role: userData.role,
            isApproved: userData.isApproved,
            isDeleted: userData.isDeleted,
            hasFreeUsed: userData.hasUsedFree,
            subscription: userData.subscriptionId,
            subscriptionStartDate: userData.subscriptionStart,
            subscriptionEndDate: userData.subscriptionEnd,
            accessToken: accessToken,
        };
    }
});
const registerWithOtpIntoDB = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const hashedPassword = yield bcrypt.hash(payload.password, 12);
    // Email check
    const isUserExistWithTheGmail = yield prisma_1.prisma.user.findUnique({
        where: { email: payload.email },
        select: { id: true, email: true },
    });
    if (isUserExistWithTheGmail === null || isUserExistWithTheGmail === void 0 ? void 0 : isUserExistWithTheGmail.id) {
        throw new AppError_1.default(http_status_1.default.CONFLICT, 'User already exists');
    }
    // OTP generate (number) — static 123456 in test mode (AUTO_VERIFY_SIGNUPS).
    const otp = (0, otp_1.isTestOtpMode)() ? 123456 : Math.floor(100000 + Math.random() * 900000);
    // Test mode (AUTO_VERIFY_SIGNUPS): auto-grant an active subscription so any
    // TestFlight tester lands straight in without the paywall. REMOVE before launch.
    const testSub = (0, otp_1.isTestOtpMode)()
        ? { isEmailVerified: true, subscriptionStart: new Date(), subscriptionEnd: new Date('2030-12-31T00:00:00.000Z'), hasUsedFree: true }
        : {};
    const userData = Object.assign(Object.assign(Object.assign({}, payload), { password: hashedPassword, otp: otp.toString(), otpExpiry: (0, otp_1.otpExpiryTime)() }), testSub);
    const newUser = yield prisma_1.prisma.user.create({
        data: userData,
        include: { subscription: true },
    });
    try {
        const html = (0, spainxOtp_1.generateOtpEmail)(otp);
        yield (0, spainxOtp_1.default)(newUser.email, html, 'OTP Verification');
    }
    catch (_a) {
        throw new AppError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, 'Failed to send OTP email');
    }
    return 'Please check mail to verify your email';
});
// const registerWithOtpIntoDB = async (
//   payload: User & { subscriptionType: SubscriptionType },
// ) => {
//   const hashedPassword: string = await bcrypt.hash(payload.password, 12);
//   // Email check
//   const isUserExistWithTheGmail = await prisma.user.findUnique({
//     where: { email: payload.email },
//     select: { id: true, email: true },
//   });
//   if (isUserExistWithTheGmail?.id) {
//     throw new AppError(httpStatus.CONFLICT, 'User already exists');
//   }
//   // OTP generate (number)
//   const otp: number = Math.floor(100000 + Math.random() * 900000);
//   const userData: User = {
//     ...payload,
//     password: hashedPassword,
//     otp: otp.toString(),
//     otpExpiry: otpExpiryTime(),
//   };
//   // TODO: Check subscription type
//   if (payload.subscriptionType === SubscriptionType.FREE) {
//     // Free subscription - direct create user with subscription
//     const freeSubscription = await prisma.subscription.findFirst({
//       where: { subscriptionType: SubscriptionType.FREE },
//     });
//     const newUser = await prisma.user.create({
//       data: {
//         ...userData,
//         subscriptionId: freeSubscription?.id,
//       },
//       include: { subscription: true },
//     });
//     try {
//       const html = generateOtpEmail(otp);
//       await emailSender(newUser.email, html, 'OTP Verification');
//     } catch {
//       throw new AppError(
//         httpStatus.INTERNAL_SERVER_ERROR,
//         'Failed to send OTP email',
//       );
//     }
//     return 'Please check mail to verify your email';
//   } else {
//     // Monthly or Yearly subscription
//     // TODO: Create user first
//     const newUser = await prisma.user.create({
//       data: userData,
//     });
//     // TODO: Create payment record for the subscription
//     const subscription = await prisma.subscription.findFirst({
//       where: { subscriptionType: payload.subscriptionType },
//     });
//     if (!subscription) {
//       throw new AppError(httpStatus.BAD_REQUEST, 'Subscription not found');
//     }
//     await prisma.payment.create({
//       data: {
//         userId: newUser.id,
//         subscriptionId: subscription.id,
//         amount: subscription.price,
//         currency: 'usd', // TODO: could be dynamic if needed
//         status: PaymentStatus.PENDING, // payment pending initially
//       },
//     });
//     try {
//       const html = generateOtpEmail(otp);
//       await emailSender(newUser.email, html, 'OTP Verification');
//     } catch {
//       throw new AppError(
//         httpStatus.INTERNAL_SERVER_ERROR,
//         'Failed to send OTP email',
//       );
//     }
//     return 'User registered. Please check mail to verify your email and complete payment';
//   }
// };
const verifyEmailWithOtp = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const { userData } = yield (0, verifyOtp_1.verifyOtp)(payload);
    yield prisma_1.prisma.user.update({
        where: {
            email: userData.email,
        },
        data: {
            otp: null,
            otpExpiry: null,
            isEmailVerified: true,
        },
        select: {
            id: true,
        },
    });
    const accessToken = yield (0, generateToken_1.generateToken)({
        id: userData.id,
        name: userData.fullName,
        email: userData.email,
        role: userData.role,
    }, config_1.default.jwt.access_secret, config_1.default.jwt.access_expires_in);
    return {
        id: userData.id,
        name: userData.fullName,
        email: userData.email,
        role: userData.role,
        accessToken: accessToken,
    };
});
const resendVerificationWithOtp = (email) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield prisma_1.insecurePrisma.user.findFirst({
        where: {
            email,
        },
    });
    if ((user === null || user === void 0 ? void 0 : user.status) === client_1.UserStatus.SUSPENDED) {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, 'User is Suspended');
    }
    if (user === null || user === void 0 ? void 0 : user.isEmailVerified) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Email is already verified');
    }
    const otp = (0, otp_1.generateOTP)();
    const expiry = (0, otp_1.otpExpiryTime)();
    yield prisma_1.prisma.user.update({
        where: { email },
        data: {
            otp,
            otpExpiry: expiry,
        },
    });
    try {
        yield (0, sendMail_1.sendOtpViaMail)(email, otp);
    }
    catch (_a) {
        throw new AppError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, 'Failed to send OTP email');
    }
    return {
        message: 'Verification OTP sent successfully. Please check your inbox.',
    };
});
const changePassword = (user, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const userData = yield prisma_1.insecurePrisma.user.findUnique({
        where: {
            email: user.email,
            status: 'ACTIVE',
        },
    });
    if (!userData) {
        throw new AppError_1.default(401, 'User not found');
    }
    const isCorrectPassword = yield bcrypt.compare(payload.oldPassword, userData.password);
    if (!isCorrectPassword) {
        throw new Error('Password incorrect!');
    }
    const hashedPassword = yield bcrypt.hash(payload.newPassword, 12);
    yield prisma_1.prisma.user.update({
        where: {
            id: userData.id,
        },
        data: {
            password: hashedPassword,
        },
    });
    return {
        message: 'Password changed successfully!',
    };
});
const forgetPassword = (email) => __awaiter(void 0, void 0, void 0, function* () {
    const userData = yield prisma_1.prisma.user.findUnique({
        where: {
            email,
        },
        select: {
            email: true,
            status: true,
            id: true,
            otpExpiry: true,
            otp: true,
        },
    });
    if (!userData) {
        throw new AppError_1.default(401, 'User not found');
    }
    if (userData.status === client_1.UserStatus.SUSPENDED) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'User has suspended');
    }
    if (userData.otp &&
        userData.otpExpiry &&
        new Date(userData.otpExpiry).getTime() > Date.now()) {
        const message = (0, otp_1.getOtpStatusMessage)(userData.otpExpiry);
        throw new AppError_1.default(http_status_1.default.CONFLICT, message);
    }
    const otp = (0, otp_1.isTestOtpMode)() ? 123456 : Math.floor(100000 + Math.random() * 900000);
    const expireTime = (0, otp_1.otpExpiryTime)();
    try {
        yield prisma_1.prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            yield tx.user.update({
                where: { email },
                data: {
                    otp: otp.toString(),
                    otpExpiry: expireTime,
                },
            });
            try {
                const html = (0, spainxOtp_1.generateOtpEmail)(otp);
                yield (0, spainxOtp_1.default)(userData.email, html, 'OTP Verification');
            }
            catch (emailErr) {
                yield tx.user.update({
                    where: { email },
                    data: {
                        otp: null,
                        otpExpiry: null,
                    },
                });
                throw new AppError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, 'Failed to send OTP email');
            }
        }));
    }
    catch (error) {
        throw new AppError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, 'Failed to send OTP');
    }
});
const verifyForgotPassOtp = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield prisma_1.prisma.user.findUnique({
        where: { email: payload.email },
        select: {
            otp: true,
            otpExpiry: true,
        },
    });
    if (!user) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'This user is not found!');
    }
    if (user.otp !== payload.otp ||
        !user.otpExpiry ||
        user.otpExpiry < new Date()) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Invalid OTP');
    }
    yield prisma_1.prisma.user.update({
        where: {
            email: payload.email,
        },
        data: {
            otp: null,
            otpExpiry: null,
        },
    });
    return { message: 'OTP verification successful' };
});
const resetPassword = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if the user exists
    const user = yield prisma_1.prisma.user.findUnique({
        where: { email: payload.email },
    });
    if (!user) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'This user is not found!');
    }
    // Hash the new password
    const hashedPassword = yield bcrypt.hash(payload.password, 10);
    // Update the user's password in the database
    yield prisma_1.prisma.user.update({
        where: { email: payload.email },
        data: {
            password: hashedPassword,
            otp: null,
            otpExpiry: null,
        },
    });
    return { message: 'Password reset successfully' };
});
exports.AuthServices = {
    loginWithOtpFromDB,
    registerWithOtpIntoDB,
    verifyEmailWithOtp,
    resendVerificationWithOtp,
    changePassword,
    forgetPassword,
    verifyForgotPassOtp,
    resetPassword,
    createFirebaseLogin,
};
