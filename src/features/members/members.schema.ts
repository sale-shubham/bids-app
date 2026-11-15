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

export const phoneCodeSchema = z.object({ code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code') });

// The API verifies a 10-digit Indian mobile (starts 6-9). The profile field is looser
// ("+91 98765 43210"), so reduce it to that form; null when it cannot be verified.
export function toIndianMobile(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}
