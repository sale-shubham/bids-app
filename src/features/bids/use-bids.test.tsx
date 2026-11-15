import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './bids.api';
import { useBuyNow, usePlaceBid } from './use-bids';

const toast = vi.hoisted(() => ({ success: vi.fn(), warning: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('./bids.api');
vi.mock('@/lib/engagement', () => ({ recordEngagement: vi.fn() }));

function setup() {
  const qc = new QueryClient();
  const invalidate = vi.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return { qc, invalidate, wrapper };
}

beforeEach(() => vi.clearAllMocks());

describe('usePlaceBid', () => {
  it('success toast names the maximum and caches the auction', async () => {
    vi.mocked(api.placeBid).mockResolvedValue({ auction: { id: 'a1' } as never, bid: null, serverTime: null, outbidByProxy: false });
    const { qc, wrapper } = setup();
    const { result } = renderHook(() => usePlaceBid('a1'), { wrapper });
    await act(() => result.current.mutateAsync(150000));
    expect(api.placeBid).toHaveBeenCalledWith('a1', 150000);
    expect(toast.success).toHaveBeenCalledWith('Maximum bid of ₹1,500 placed');
    expect(qc.getQueryData(['auction', 'a1'])).toEqual({ id: 'a1' });
  });

  it('outbidByProxy shows the "try a higher maximum" toast instead of success', async () => {
    vi.mocked(api.placeBid).mockResolvedValue({ auction: { id: 'a1' } as never, bid: null, serverTime: null, outbidByProxy: true });
    const { wrapper } = setup();
    const { result } = renderHook(() => usePlaceBid('a1'), { wrapper });
    await act(() => result.current.mutateAsync(150000));
    expect(toast.warning).toHaveBeenCalledWith("Another bidder's maximum is higher. Try a higher maximum.");
    expect(toast.success).not.toHaveBeenCalled();
  });
});

describe('useBuyNow', () => {
  it('sets the auction from the response and invalidates the bid keys', async () => {
    vi.mocked(api.buyNow).mockResolvedValue({ auction: { id: 'a1', status: 'ENDED' } as never, serverTime: null });
    const { qc, invalidate, wrapper } = setup();
    const { result } = renderHook(() => useBuyNow('a1'), { wrapper });
    await act(() => result.current.mutateAsync());
    await waitFor(() => expect(qc.getQueryData(['auction', 'a1'])).toEqual({ id: 'a1', status: 'ENDED' }));
    for (const queryKey of [['auction-bids', 'a1'], ['my-bids'], ['auctions']]) expect(invalidate).toHaveBeenCalledWith({ queryKey });
  });
});
