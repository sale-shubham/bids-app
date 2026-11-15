import { z } from '@/lib/zod';
import { GSTIN_RE, GST_STATES, gstinMatchesState } from '@/lib/gst';
import type { InvoiceSettings } from './invoices.types';

// Admin "Invoice details" form. GST rate is shown as a percentage and sent as basis points.
export const invoiceSettingsSchema = z
  .object({
    legalName: z.string().trim().min(2, 'Legal name is required').max(200),
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .refine((v) => v === '' || GSTIN_RE.test(v), 'Enter a valid 15-character GSTIN'),
    address: z.string().trim().min(5, 'Address is required').max(500),
    stateCode: z.string().refine((v) => GST_STATES.some((s) => s.code === v), 'Choose a state'),
    gstRatePercent: z
      .string()
      .trim()
      .refine((v) => /^\d+(\.\d{1,2})?$/.test(v) && Number(v) <= 40, 'Enter a rate from 0 to 40, up to 2 decimals'),
    commissionInclusive: z.boolean(),
    sacCode: z.string().trim().regex(/^\d{4,8}$/, 'SAC code is 4 to 8 digits'),
  })
  .refine((v) => !v.gstin || gstinMatchesState(v.gstin, v.stateCode), {
    path: ['gstin'],
    message: 'The first 2 digits of the GSTIN must match the state code',
  });

export type InvoiceSettingsValues = z.infer<typeof invoiceSettingsSchema>;

export function invoiceSettingsToForm(s: InvoiceSettings): InvoiceSettingsValues {
  return {
    legalName: s.legalName,
    gstin: s.gstin,
    address: s.address,
    stateCode: s.stateCode,
    gstRatePercent: (s.gstRateBps / 100).toFixed(2),
    commissionInclusive: s.commissionInclusive,
    sacCode: s.sacCode,
  };
}

export function formToInvoiceSettings(v: InvoiceSettingsValues): InvoiceSettings {
  return {
    legalName: v.legalName,
    gstin: v.gstin,
    address: v.address,
    stateCode: v.stateCode,
    gstRateBps: Math.round(Number(v.gstRatePercent) * 100),
    commissionInclusive: v.commissionInclusive,
    sacCode: v.sacCode,
  };
}
