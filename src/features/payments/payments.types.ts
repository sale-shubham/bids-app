/** The order payload both `POST /commissions/:id/checkout` and `POST /sales/:id/checkout` return. `keyId === 'stub'` means test mode. */
export interface CheckoutPayload {
  orderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
  description: string;
  prefill: { name?: string; email?: string; contact?: string };
}
