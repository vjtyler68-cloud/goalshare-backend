"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insecurePrisma = exports.prisma = void 0;
const client_1 = require("@prisma/client");
exports.prisma = new client_1.PrismaClient({
    omit: {
        user: {
            password: true,
            otp: true,
            otpExpiry: true,
            isEmailVerified: true,
            isAgreeWithTerms: true,
        },
    },
});
exports.insecurePrisma = new client_1.PrismaClient();
