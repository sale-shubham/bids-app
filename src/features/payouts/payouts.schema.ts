import { z } from '@/lib/zod';
import type { PayoutAccountInput } from './payouts.types';

// Mirrors bids-api POST /payouts/account.
const upper = (s: string) => s.trim().toUpperCase();

export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const ACCOUNT_RE = /^\d{9,18}$/;
export const PHONE_RE = /^[6-9]\d{9}$/;
export const POSTAL_RE = /^\d{6}$/;

export const payoutSchema = z
  .object({
    legalName: z.string().trim().min(1, 'Enter your legal name').max(120, 'At most 120 characters'),
    businessType: z.enum(['individual', 'proprietorship'], { message: 'Choose a business type' }),
    phone: z.string().trim().regex(PHONE_RE, 'Enter a 10-digit Indian mobile number'),
    pan: z.string().transform(upper).pipe(z.string().regex(PAN_RE, 'Enter a valid PAN, e.g. ABCDE1234F')),
    accountNumber: z.string().trim().regex(ACCOUNT_RE, 'Account number must be 9 to 18 digits'),
    confirmAccountNumber: z.string().trim(),
    ifsc: z.string().transform(upper).pipe(z.string().regex(IFSC_RE, 'Enter a valid IFSC, e.g. HDFC0001234')),
    beneficiaryName: z.string().trim().min(1, 'Enter the account holder name').max(120, 'At most 120 characters'),
    street1: z.string().trim().min(1, 'Enter your street address').max(100, 'At most 100 characters'),
    city: z.string().trim().min(1, 'Enter your city').max(60, 'At most 60 characters'),
    state: z.string().trim().min(1, 'Enter your state').max(60, 'At most 60 characters'),
    postalCode: z.string().trim().regex(POSTAL_RE, 'Postal code must be 6 digits'),
  })
  .refine((v) => v.accountNumber === v.confirmAccountNumber, {
    path: ['confirmAccountNumber'],
    message: 'Account numbers do not match',
  });

export type PayoutFormValues = z.input<typeof payoutSchema>;
export type PayoutParsedValues = z.output<typeof payoutSchema>;

export const payoutDefaults: PayoutFormValues = {
  legalName: '',
  businessType: 'individual',
  phone: '',
  pan: '',
  accountNumber: '',
  confirmAccountNumber: '',
  ifsc: '',
  beneficiaryName: '',
  street1: '',
  city: '',
  state: '',
  postalCode: '',
};

export function toPayoutPayload(v: PayoutParsedValues): PayoutAccountInput {
  return {
    legalName: v.legalName,
    businessType: v.businessType,
    phone: v.phone,
    pan: v.pan,
    accountNumber: v.accountNumber,
    ifsc: v.ifsc,
    beneficiaryName: v.beneficiaryName,
    address: { street1: v.street1, city: v.city, state: v.state, postalCode: v.postalCode },
  };
}
