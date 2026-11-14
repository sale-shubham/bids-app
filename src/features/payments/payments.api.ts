import { api } from '@/lib/api-client';

// Razorpay Orders API calls (commission payments). The checkout itself is
// opened with src/lib/razorpay.ts; these two endpoints create the order and
// verify the signature the Checkout `handler` returns.

export interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export async function createCommissionOrder(commissionId: string): Promise<PaymentOrder> {
  const res = await api.post('/payments/orders', { commissionId });
  return res.data.data;
}

export async function verifyOrderPayment(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const res = await api.post('/payments/orders/verify', input);
  return res.data.data;
}
