"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userValidation = void 0;
const zod_1 = require("zod");
const constant_1 = require("../../constant");
const updateUser = zod_1.z.object({
    body: zod_1.z.object({
        fullName: zod_1.z
            .string()
            .optional(),
        businessType: zod_1.z
            .string()
            .optional(),
        describe: zod_1.z
            .string()
            .optional(),
        city: zod_1.z
            .string()
            .max(100)
            .nullable()
            .optional()
            .transform(v => (v === '' ? null : v)),
        address: zod_1.z
            .string()
            .max(300)
            .nullable()
            .optional()
            .transform(v => (v === '' ? null : v)),
        phoneNumber: zod_1.z
            .string()
            .regex(/^\+?[0-9]{7,15}$/, 'Invalid phone number')
            .nullable()
            .optional(),
        role: zod_1.z.enum(['USER', 'ADMIN']).optional(),
        status: zod_1.z.enum(['ACTIVE', 'SUSPENDED']).optional(),
    }),
});
const updateUserRoleSchema = zod_1.z.object({
    body: zod_1.z.object({
        role: zod_1.z.enum(constant_1.userRole),
    }),
});
const updateUserStatus = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum(constant_1.userStatus),
    }),
});
exports.userValidation = {
    updateUser,
    updateUserRoleSchema,
    updateUserStatus,
};
