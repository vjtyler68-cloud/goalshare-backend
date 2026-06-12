"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunityValidation = void 0;
const zod_1 = require("zod");
const createCommunityZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        // Example fields (customize as needed)
        name: zod_1.z.string({ required_error: 'Name is required' }),
    }),
});
const updateCommunityZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().optional(),
    }),
});
exports.CommunityValidation = {
    createCommunityZodSchema,
    updateCommunityZodSchema,
};
