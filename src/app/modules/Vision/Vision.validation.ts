import { z } from 'zod';

const createVisionZodSchema = z.object({
  body: z.object({
    // Example fields (customize as needed)
    name: z.string({ required_error: 'Name is required' }),
  }),
});

const updateVisionZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
  }),
});

export const VisionValidation = {
  createVisionZodSchema,
  updateVisionZodSchema,
};
