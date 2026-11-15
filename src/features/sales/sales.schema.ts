import { z } from '@/lib/zod';
import type { ShipSaleInput } from './sales.types';

export const disputeSchema = z.object({
  reason: z.string().trim().min(10, 'Please describe the problem (at least 10 characters)').max(1000, 'At most 1000 characters'),
});
export type DisputeValues = z.infer<typeof disputeSchema>;

export const shipSchema = z
  .object({
    method: z.enum(['COURIER', 'PICKUP'], { message: 'Choose how the item is delivered' }),
    courier: z.string().trim().max(60, 'At most 60 characters'),
    trackingNo: z.string().trim().max(60, 'At most 60 characters'),
  })
  .superRefine((v, ctx) => {
    if (v.method === 'COURIER' && !v.courier) ctx.addIssue({ code: 'custom', path: ['courier'], message: 'Enter the courier name' });
  });
export type ShipValues = z.infer<typeof shipSchema>;

export function toShipPayload(v: ShipValues): ShipSaleInput {
  const out: ShipSaleInput = { method: v.method };
  if (v.method === 'COURIER') out.courier = v.courier.trim();
  if (v.trackingNo.trim()) out.trackingNo = v.trackingNo.trim();
  return out;
}
