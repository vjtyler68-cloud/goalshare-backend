import { z } from 'zod';

const createMotivationZodSchema = z.object({
  body: z.object({
    // Example fields (customize as needed)
    name: z.string({ required_error: 'Name is required' }),
  }),
});

const updateMotivationZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
  }),
});

export const MotivationValidation = {
  createMotivationZodSchema,
  updateMotivationZodSchema,
};
