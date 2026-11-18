import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePagedList } from './use-paged-list';

const narrow = vi.hoisted(() => ({ value: false }));
vi.mock('@/hooks/use-is-narrow-content', () => ({ useIsNarrowContent: () => narrow.value }));

const page = { items: [{ id: 'a' }], meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 } };

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  const fetcher = vi.fn().mockResolvedValue(page);
  const hook = renderHook(() => usePagedList(['things'], { q: 'x' }, 2, 25, fetcher), { wrapper });
  return { qc, fetcher, hook };
}

describe('usePagedList', () => {
  beforeEach(() => {
    narrow.value = false;
  });

  it('uses the offset key on wide layouts', async () => {
    const { qc, fetcher } = setup();
    await waitFor(() => expect(fetcher).toHaveBeenCalledWith({ q: 'x' }, 2, 25));
    const keys = qc.getQueryCache().getAll().map((q) => q.queryKey);
    expect(keys).toContainEqual(['things', 'list', { q: 'x' }, 2, 25]);
  });

  it('uses the infinite key and 100-item batches on narrow layouts', async () => {
    narrow.value = true;
    const { qc, fetcher, hook } = setup();
    await waitFor(() => expect(fetcher).toHaveBeenCalledWith({ q: 'x' }, 1, 100));
    const keys = qc.getQueryCache().getAll().map((q) => q.queryKey);
    expect(keys).toContainEqual(['things', 'infinite', { q: 'x' }]);
    await waitFor(() => expect(hook.result.current.mobileItems).toEqual([{ id: 'a' }]));
  });
});
