import { z } from 'zod';

const enquiryStatusSchema = z.enum(['NEW', 'CONTACTED', 'CONVERTED', 'CANCELLED']);
export type EnquiryStatus = z.infer<typeof enquiryStatusSchema>;

export const createEnquirySchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  brideName: z.string().optional(),
  groomName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  eventDate: z.string().optional(),
  eventType: z.string().optional(),
  eventDuration: z.number().int().min(1).optional(),
  location: z.string().optional(),
  services: z.array(z.string()).optional(),
  budget: z.string().optional(),
  message: z.string().optional(),
  source: z.string().optional(),
});

export const updateEnquirySchema = z.object({
  status: enquiryStatusSchema.optional(),
});

export const listEnquiriesQuerySchema = z.object({
  search: z.string().optional(),
  status: enquiryStatusSchema.optional(),
});
