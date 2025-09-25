import { z } from 'zod';

const createGoalZodSchema = z.object({
  body: z.object({
    // Example fields (customize as needed)
    name: z.string({ required_error: 'Name is required' }),
  }),
});

const updateGoalZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
  }),
});

export const GoalValidation = {
  createGoalZodSchema,
  updateGoalZodSchema,
};
