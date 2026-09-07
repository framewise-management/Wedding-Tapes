import { z } from 'zod';

export const proposalStatuses = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'] as const;
export const discountTypes = ['FIXED', 'PERCENTAGE'] as const;
export const proposalTemplates = ['DARK_LUXE', 'BRIGHT_MODERN', 'EDITORIAL'] as const;

export const discountInputSchema = z.object({
  type: z.enum(discountTypes),
  value: z.number().int().min(0),
});

// eventIndex points into the request's own `events` array, or -- when the
// request omits it -- into the proposal's existing events in date order.
// Omitted entirely means the line covers the whole proposal.
export const proposalPackageInputSchema = z.object({
  packageId: z.uuid(),
  quantity: z.number().int().min(1).default(1),
  eventIndex: z.number().int().min(0).optional(),
});

export const proposalItemInputSchema = z.object({
  serviceId: z.uuid(),
  quantity: z.number().int().min(1).default(1),
  isOptional: z.boolean().default(false),
  eventIndex: z.number().int().min(0).optional(),
});

export const proposalEventInputSchema = z.object({
  eventTypeId: z.uuid().optional(),
  name: z.string().min(1, 'event name should not be empty'),
  date: z.iso.date(),
  location: z.string().optional(),
});
export type ProposalEventInput = z.infer<typeof proposalEventInputSchema>;

const eventsInput = z.array(proposalEventInputSchema).min(1, 'Add at least one event').optional();

export const createProposalSchema = z.object({
  customerId: z.uuid(),
  events: eventsInput,
  // Derived from `events` when supplied; still accepted on its own so an
  // events-less proposal keeps working.
  weddingDate: z.iso.date().optional(),
  weddingLocation: z.string().min(1, 'weddingLocation should not be empty'),
  numberOfDays: z.number().int().min(1).optional(),
  notes: z.string().optional(),
  validUntil: z.iso.date().optional(),
  packages: z.array(proposalPackageInputSchema).optional(),
  items: z.array(proposalItemInputSchema).optional(),
  discount: discountInputSchema.optional(),
  taxRate: z.number().int().min(0).optional(),
  template: z.enum(proposalTemplates).optional(),
}).refine((v) => v.events !== undefined || v.weddingDate !== undefined, {
  message: 'Add at least one event',
  path: ['events'],
});
export type CreateProposalInput = z.infer<typeof createProposalSchema>;

export const updateProposalSchema = z.object({
  customerId: z.uuid().optional(),
  events: eventsInput,
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
  customerId: z.uuid().optional(),
});

export const updateProposalStatusSchema = z.object({
  status: z.enum(proposalStatuses),
});
export type UpdateProposalStatusInput = z.infer<typeof updateProposalStatusSchema>;
