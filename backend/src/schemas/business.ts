import { z } from 'zod';

export const updateBusinessSchema = z.object({
  name: z.string().optional(),
  logo: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('email must be an email').optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  instagram: z.string().optional(),
  defaultValidityDays: z.number().int().min(0).optional(),
  defaultTerms: z.string().optional(),
});

export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
