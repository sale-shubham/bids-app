import { z } from '@/lib/zod';

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
