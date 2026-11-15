'use client';
import { useQuery } from '@tanstack/react-query';
import * as api from './settings.api';
import { resolveMaxPricePaise } from './settings.utils';

export function usePublicSettings() {
  return useQuery({ queryKey: ['settings', 'public'], queryFn: api.fetchPublicSettings, staleTime: 5 * 60_000 });
}

/** Platform maximum price (paise); the default while loading or when the API omits it. */
export function useMaxPricePaise(): number {
  const { data } = usePublicSettings();
  return resolveMaxPricePaise(data?.maxPricePaise);
}
