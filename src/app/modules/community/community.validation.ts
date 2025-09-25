import { z } from 'zod';

const createCommunityZodSchema = z.object({
  body: z.object({
    // Example fields (customize as needed)
    name: z.string({ required_error: 'Name is required' }),
  }),
});

const updateCommunityZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
  }),
});

export const CommunityValidation = {
  createCommunityZodSchema,
  updateCommunityZodSchema,
};
