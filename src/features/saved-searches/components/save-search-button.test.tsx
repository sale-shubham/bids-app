import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_FILTERS } from '@/features/auctions/auctions.filters';
import type { AuctionFilters } from '@/features/auctions/auctions.types';
import { useAuthStore, type AuthMember } from '@/store/auth-store';
import * as api from '../saved-searches.api';
import { SaveSearchButton } from './save-search-button';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('../saved-searches.api');

const signIn = (role: AuthMember['role'] | null) =>
  useAuthStore.setState({ member: role ? ({ id: 'u1', role } as AuthMember) : null, initialized: true });

function renderButton(filters: AuctionFilters) {
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <SaveSearchButton filters={filters} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  signIn('BIDDER');
});

describe('SaveSearchButton', () => {
  it('is hidden for guests, non-bidders and when no criterion is set', () => {
    signIn(null);
    renderButton({ ...DEFAULT_FILTERS, q: 'vase' });
    expect(screen.queryByRole('button', { name: /Save this search/ })).not.toBeInTheDocument();
    cleanup();
    signIn('AUCTIONEER');
    renderButton({ ...DEFAULT_FILTERS, q: 'vase' });
    expect(screen.queryByRole('button', { name: /Save this search/ })).not.toBeInTheDocument();
    cleanup();
    signIn('BIDDER');
    renderButton(DEFAULT_FILTERS);
    expect(screen.queryByRole('button', { name: /Save this search/ })).not.toBeInTheDocument();
  });

  it('posts the filters with rupees converted to paise and the optional name', async () => {
    vi.mocked(api.createSavedSearch).mockResolvedValue({ id: 's1' } as never);
    renderButton({ ...DEFAULT_FILTERS, q: 'vase', condition: 'USED', minPrice: 500, maxPrice: 2000 });
    await userEvent.click(screen.getByRole('button', { name: /Save this search/ }));
    await userEvent.type(screen.getByLabelText(/Name/), 'My vases');
    await userEvent.click(screen.getByRole('button', { name: 'Save search' }));
    await waitFor(() =>
      expect(api.createSavedSearch).toHaveBeenCalledWith({
        name: 'My vases',
        q: 'vase',
        condition: 'USED',
        minPricePaise: 50000,
        maxPricePaise: 200000,
      }),
    );
    expect(toast.success).toHaveBeenCalled();
  });

  it('works without a name', async () => {
    vi.mocked(api.createSavedSearch).mockResolvedValue({ id: 's1' } as never);
    renderButton({ ...DEFAULT_FILTERS, category: 'Art' });
    await userEvent.click(screen.getByRole('button', { name: /Save this search/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Save search' }));
    await waitFor(() => expect(api.createSavedSearch).toHaveBeenCalledWith({ category: 'Art' }));
  });
});
