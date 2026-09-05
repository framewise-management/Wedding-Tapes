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

// Both optional: an empty body means "reconnect with the saved password".
export const connectAppleCalendarSchema = z.object({
  appleId: z.string().email('appleId must be an email').optional(),
  appPassword: z.string().min(1, 'appPassword is required').optional(),
});

export type ConnectAppleCalendarInput = z.infer<typeof connectAppleCalendarSchema>;
