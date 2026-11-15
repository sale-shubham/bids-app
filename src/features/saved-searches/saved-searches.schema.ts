import { z } from '@/lib/zod';

export const savedSearchSchema = z.object({
  name: z.string().trim().max(60, 'At most 60 characters'),
});
export type SavedSearchFormValues = z.infer<typeof savedSearchSchema>;
