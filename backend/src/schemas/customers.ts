import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'name should not be empty'),
  phone: z.string().min(1, 'phone should not be empty'),
  email: z.string().email('email must be an email').optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = z.object({
  name: z.string().min(1, 'name should not be empty').optional(),
  phone: z.string().min(1, 'phone should not be empty').optional(),
  email: z.string().email('email must be an email').optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const listCustomersQuerySchema = z.object({
  search: z.string().optional(),
});
