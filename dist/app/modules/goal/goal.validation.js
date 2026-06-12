"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalValidation = void 0;
const zod_1 = require("zod");
const createGoalZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        // Example fields (customize as needed)
        name: zod_1.z.string({ required_error: 'Name is required' }),
    }),
});
const updateGoalZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().optional(),
    }),
});
exports.GoalValidation = {
    createGoalZodSchema,
    updateGoalZodSchema,
};
