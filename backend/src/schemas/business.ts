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
  bankDetails: z.string().optional(),
  upiId: z.string().optional(),
  paymentNotes: z.string().optional(),
  paymentConditions: z
    .array(
      z.object({
        label: z.string().min(1, 'payment condition label is required'),
        percent: z.number().int().min(0).max(100),
      }),
    )
    .max(10)
    .refine(
      (rows) => rows.length === 0 || rows.reduce((sum, r) => sum + r.percent, 0) === 100,
      'payment conditions must add up to 100%',
    )
    .optional(),
  paymentModes: z.array(z.enum(['UPI', 'BANK', 'CASH', 'CHEQUE', 'CARD'])).optional(),
  gstNumber: z.string().optional(),
  invoicePrefix: z.string().optional(),
  invoiceNextNumber: z.number().int().min(1).optional(),
  receiptPrefix: z.string().optional(),
  receiptNextNumber: z.number().int().min(1).optional(),
});

export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;

// Both optional: an empty body means "reconnect with the saved password".
export const connectAppleCalendarSchema = z.object({
  appleId: z.string().email('appleId must be an email').optional(),
  appPassword: z.string().min(1, 'appPassword is required').optional(),
});

export type ConnectAppleCalendarInput = z.infer<typeof connectAppleCalendarSchema>;
