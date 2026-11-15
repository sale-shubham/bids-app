import { api } from '@/lib/api-client';

export type PaymentReferenceType = 'COMMISSION' | 'SALE' | 'DEPOSIT' | 'FEATURE';

export interface VerifyPaymentResult {
  referenceType: PaymentReferenceType;
  commission?: unknown;
  sale?: unknown;
}

// POST /payments/verify — confirms the signature Razorpay Checkout's handler
// returned (or the stub values in test mode). The order itself is created by
// POST /commissions/:id/checkout or POST /sales/:id/checkout. The response says
// which kind of payment it settled: `{ referenceType: 'COMMISSION' | 'SALE' | 'DEPOSIT' | 'FEATURE', commission?, sale? }`.
// `timeoutMs` bounds the request (the shared client has no timeout) so a hung verify cannot
// leave the caller waiting forever.
export async function verifyPayment(
  input: { orderId: string; paymentId: string; signature: string },
  opts: { timeoutMs?: number } = {},
): Promise<VerifyPaymentResult> {
  const res = await api.post('/payments/verify', input, opts.timeoutMs ? { timeout: opts.timeoutMs } : undefined);
  const d = (res.data?.data ?? {}) as Partial<VerifyPaymentResult>;
  // Older API: only `commission` was returned.
  const referenceType: PaymentReferenceType = d.referenceType === 'SALE' || d.referenceType === 'DEPOSIT' || d.referenceType === 'FEATURE' ? d.referenceType : 'COMMISSION';
  return { ...d, referenceType };
}
