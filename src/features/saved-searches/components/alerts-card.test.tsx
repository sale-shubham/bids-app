import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore, type AuthMember } from '@/store/auth-store';
import * as api from '../saved-searches.api';
import { AlertsCard } from './alerts-card';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('../saved-searches.api');

const item = {
  id: 's1',
  name: 'My vases',
  q: 'vase',
  category: null,
  condition: null,
  minPricePaise: null,
  maxPricePaise: 200000,
  createdAt: '2026-11-01T00:00:00Z',
};

function renderCard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <AlertsCard />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ member: { id: 'u1', role: 'BIDDER' } as AuthMember, initialized: true });
});

describe('AlertsCard', () => {
  it('lists saved searches with a summary and a results link', async () => {
    vi.mocked(api.fetchSavedSearches).mockResolvedValue([item]);
    renderCard();
    expect(await screen.findByText('My vases')).toBeInTheDocument();
    expect(screen.getByText('"vase" · Up to ₹2,000')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View results' })).toHaveAttribute('href', '/auctions?q=vase&maxPrice=2000');
  });

  it('shows an empty state', async () => {
    vi.mocked(api.fetchSavedSearches).mockResolvedValue([]);
    renderCard();
    expect(await screen.findByText('No saved searches')).toBeInTheDocument();
  });

  it('delete asks for confirmation first', async () => {
    vi.mocked(api.fetchSavedSearches).mockResolvedValue([item]);
    vi.mocked(api.deleteSavedSearch).mockResolvedValue();
    renderCard();
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(api.deleteSavedSearch).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(api.deleteSavedSearch).toHaveBeenCalledWith('s1'));
  });
});
