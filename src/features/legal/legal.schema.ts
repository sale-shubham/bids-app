import { z } from '@/lib/zod';

// Admin legal-page editor form. One HTML blob per page slug — an empty string
// is valid (an unpublished page renders a "not published yet" notice).
export const legalPagesFormSchema = z.object({
  contents: z.record(z.string(), z.string()),
});

export type LegalPagesFormValues = z.infer<typeof legalPagesFormSchema>;
