import { z } from 'zod';
import { booleanQueryParam } from './common';

export const createPackageSchema = z.object({
  name: z.string().min(1, 'name should not be empty'),
  description: z.string().optional(),
  price: z.number().int().min(0),
  services: z
    .array(
      z.object({
        serviceId: z.uuid(),
        quantity: z.number().int().min(1).default(1),
      }),
    )
    .optional(),
});
export type CreatePackageInput = z.infer<typeof createPackageSchema>;

export const updatePackageSchema = z.object({
  name: z.string().min(1, 'name should not be empty').optional(),
  description: z.string().optional(),
  price: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});
export type UpdatePackageInput = z.infer<typeof updatePackageSchema>;

export const addPackageServiceSchema = z.object({
  serviceId: z.uuid(),
  quantity: z.number().int().min(1).default(1),
});
export type AddPackageServiceInput = z.infer<typeof addPackageServiceSchema>;

export const listPackagesQuerySchema = z.object({
  active: booleanQueryParam,
});
