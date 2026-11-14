'use client';
import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export const ADMIN_PAGE_SIZES = [10, 25, 50];

/**
 * URL-synced filter state. `defaults` lists every string filter and its default;
 * values equal to the default are dropped from the URL. Changing any filter
 * resets `page` to 1. `page` / `pageSize` are parsed here too.
 */
export function useUrlState<K extends string>(defaults: Record<K, string>) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const values = {} as Record<K, string>;
  for (const k of Object.keys(defaults) as K[]) values[k] = sp.get(k) ?? defaults[k];

  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1);
  const rawSize = parseInt(sp.get('pageSize') ?? '', 10);
  const pageSize = ADMIN_PAGE_SIZES.includes(rawSize) ? rawSize : ADMIN_PAGE_SIZES[0];

  const update = React.useCallback(
    (patch: Partial<Record<K | 'page' | 'pageSize', string>>) => {
      const next = new URLSearchParams(sp.toString());
      const keys = Object.keys(patch) as (K | 'page' | 'pageSize')[];
      for (const k of keys) {
        const v = patch[k] ?? '';
        const def = k === 'page' ? '1' : k === 'pageSize' ? String(ADMIN_PAGE_SIZES[0]) : defaults[k as K];
        if (v === '' || v === def) next.delete(k);
        else next.set(k, v);
      }
      if (!keys.includes('page')) next.delete('page');
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [sp, router, pathname, defaults],
  );

  return { values, page, pageSize, update };
}
