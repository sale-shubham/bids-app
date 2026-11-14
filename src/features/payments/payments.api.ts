import { api } from '@/lib/api-client';

// POST /payments/verify — confirms the signature Razorpay Checkout's handler
// returned (or the stub values in test mode). The commission order itself is
// created by POST /commissions/:id/checkout (see features/commissions).
export async function verifyPayment(input: { orderId: string; paymentId: string; signature: string }) {
  const res = await api.post('/payments/verify', input);
  return res.data.data as { commission: unknown };
}
