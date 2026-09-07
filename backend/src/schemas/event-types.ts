import { z } from 'zod';
import { booleanQueryParam } from './common';

export const createEventTypeSchema = z.object({
  name: z.string().min(1, 'name should not be empty'),
});
export type CreateEventTypeInput = z.infer<typeof createEventTypeSchema>;

export const updateEventTypeSchema = z.object({
  name: z.string().min(1, 'name should not be empty').optional(),
  active: z.boolean().optional(),
});
export type UpdateEventTypeInput = z.infer<typeof updateEventTypeSchema>;

export const listEventTypesQuerySchema = z.object({
  active: booleanQueryParam,
});
