import { z } from 'zod';
import { booleanQueryParam } from './common';

export const createTermSchema = z.object({
  title: z.string().min(1, 'title should not be empty'),
  body: z.string().min(1, 'body should not be empty'),
});
export type CreateTermInput = z.infer<typeof createTermSchema>;

export const updateTermSchema = z.object({
  title: z.string().min(1, 'title should not be empty').optional(),
  body: z.string().min(1, 'body should not be empty').optional(),
  active: z.boolean().optional(),
});
export type UpdateTermInput = z.infer<typeof updateTermSchema>;

export const listTermsQuerySchema = z.object({
  active: booleanQueryParam,
});
