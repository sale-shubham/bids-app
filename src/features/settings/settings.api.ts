import { api } from '@/lib/api-client';
import { resolveCheckoutMode, type PublicSettings } from './settings.types';

export async function fetchPublicSettings(): Promise<PublicSettings> {
  const res = await api.get('/settings/public');
  const d = (res.data as { data?: Partial<PublicSettings> } | undefined)?.data ?? {};
  return {
    commissionRateBps: d.commissionRateBps ?? 0,
    minIncrementPaise: d.minIncrementPaise ?? 0,
    antiSnipingMinutes: d.antiSnipingMinutes ?? 0,
    categories: Array.isArray(d.categories) ? d.categories : [],
    maxPricePaise: typeof d.maxPricePaise === 'number' ? d.maxPricePaise : undefined,
    checkoutMode: resolveCheckoutMode(d.checkoutMode),
  };
}
