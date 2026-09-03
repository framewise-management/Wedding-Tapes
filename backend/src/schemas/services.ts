import { z } from 'zod';
import { booleanQueryParam } from './common';

export const createServiceSchema = z.object({
  name: z.string().min(1, 'name should not be empty'),
  category: z.string().optional(),
  description: z.string().optional(),
  perDayPrice: z.number().int().min(0).optional(),
  flatPrice: z.number().int().min(0).optional(),
});
export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = z.object({
  name: z.string().min(1, 'name should not be empty').optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  perDayPrice: z.number().int().min(0).optional(),
  flatPrice: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

export const listServicesQuerySchema = z.object({
  active: booleanQueryParam,
});
