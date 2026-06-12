"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MotivationValidation = void 0;
const zod_1 = require("zod");
const createMotivationZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        // Example fields (customize as needed)
        name: zod_1.z.string({ required_error: 'Name is required' }),
    }),
});
const updateMotivationZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().optional(),
    }),
});
exports.MotivationValidation = {
    createMotivationZodSchema,
    updateMotivationZodSchema,
};
