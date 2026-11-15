import { z } from '@/lib/zod';
import { GSTIN_RE, GST_STATES, gstinMatchesState } from '@/lib/gst';

// Optional contact fields: an empty string means "not set".
export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(200),
  phone: z
    .string()
    .trim()
    .max(20, 'At most 20 characters')
    .refine((v) => v === '' || /^\+?[\d\s-]{7,20}$/.test(v), 'Enter a valid phone number'),
  address: z.string().trim().max(500, 'At most 500 characters'),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

// Optional GST billing details. An empty string means "not set"; a GSTIN must match the state code when both are set.
export const billingSchema = z
  .object({
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .refine((v) => v === '' || GSTIN_RE.test(v), 'Enter a valid 15-character GSTIN'),
    billingState: z.string().refine((v) => v === '' || GST_STATES.some((s) => s.code === v), 'Choose a state'),
  })
  .refine((v) => !v.gstin || !v.billingState || gstinMatchesState(v.gstin, v.billingState), {
    path: ['gstin'],
    message: 'The first 2 digits of the GSTIN must match your billing state code',
  });

export type BillingFormValues = z.infer<typeof billingSchema>;
