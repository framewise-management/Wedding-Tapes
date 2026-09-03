import { z } from 'zod';

export const proposalStatuses = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'] as const;
export const discountTypes = ['FIXED', 'PERCENTAGE'] as const;
export const proposalTemplates = ['DARK_LUXE', 'BRIGHT_MODERN'] as const;

export const discountInputSchema = z.object({
  type: z.enum(discountTypes),
  value: z.number().int().min(0),
});

export const proposalPackageInputSchema = z.object({
  packageId: z.uuid(),
  quantity: z.number().int().min(1).default(1),
});

export const proposalItemInputSchema = z.object({
  serviceId: z.uuid(),
  priceType: z.enum(['per_day', 'flat']).optional(),
  quantity: z.number().int().min(1).default(1),
  isOptional: z.boolean().default(false),
});

export const createProposalSchema = z.object({
  customerId: z.uuid(),
  weddingDate: z.iso.date(),
  weddingLocation: z.string().min(1, 'weddingLocation should not be empty'),
  numberOfDays: z.number().int().min(1).optional(),
  notes: z.string().optional(),
  validUntil: z.iso.date().optional(),
  packages: z.array(proposalPackageInputSchema).optional(),
  items: z.array(proposalItemInputSchema).optional(),
  discount: discountInputSchema.optional(),
  taxRate: z.number().int().min(0).optional(),
  template: z.enum(proposalTemplates).optional(),
});
export type CreateProposalInput = z.infer<typeof createProposalSchema>;

export const updateProposalSchema = z.object({
  customerId: z.uuid().optional(),
  weddingDate: z.iso.date().optional(),
  weddingLocation: z.string().min(1, 'weddingLocation should not be empty').optional(),
  numberOfDays: z.number().int().min(1).optional(),
  notes: z.string().optional(),
  validUntil: z.iso.date().optional(),
  packages: z.array(proposalPackageInputSchema).optional(),
  items: z.array(proposalItemInputSchema).optional(),
  // Omit to leave the discount untouched; pass `null` to clear it.
  discount: discountInputSchema.nullish(),
  taxRate: z.number().int().min(0).optional(),
  template: z.enum(proposalTemplates).optional(),
});
export type UpdateProposalInput = z.infer<typeof updateProposalSchema>;

export const calculateProposalSchema = z.object({
  discount: discountInputSchema.nullish(),
  taxRate: z.number().int().min(0).optional(),
});
export type CalculateProposalInput = z.infer<typeof calculateProposalSchema>;

export const listProposalsQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(proposalStatuses).optional(),
});

export const updateProposalStatusSchema = z.object({
  status: z.enum(proposalStatuses),
});
export type UpdateProposalStatusInput = z.infer<typeof updateProposalStatusSchema>;
