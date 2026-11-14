import { api } from '@/lib/api-client';

// POST /payments/verify — confirms the signature Razorpay Checkout's handler
// returned (or the stub values in test mode). The commission order itself is
// created by POST /commissions/:id/checkout (see features/commissions).
// `timeoutMs` bounds the request (the shared client has no timeout) so a hung verify cannot
// leave the caller waiting forever.
export async function verifyPayment(
  input: { orderId: string; paymentId: string; signature: string },
  opts: { timeoutMs?: number } = {},
) {
  const res = await api.post('/payments/verify', input, opts.timeoutMs ? { timeout: opts.timeoutMs } : undefined);
  return res.data.data as { commission: unknown };
}
