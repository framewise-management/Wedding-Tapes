import { z } from 'zod';

export const createBlockedDateSchema = z.object({
  date: z.iso.date(),
  reason: z.string().optional(),
});
export type CreateBlockedDateInput = z.infer<typeof createBlockedDateSchema>;
