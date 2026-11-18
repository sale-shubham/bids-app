import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  replace: vi.fn(),
  qs: '',
  useMyBids: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: m.replace }),
  usePathname: () => '/my-bids',
  useSearchParams: () => new URLSearchParams(m.qs),
}));
vi.mock('@/hooks/use-is-narrow-content', () => ({ useIsNarrowContent: () => false }));
vi.mock('@/features/bids/use-bids', () => ({ useMyBids: m.useMyBids }));

import MyBidsPage from './page';

const row = (over: object = {}) => ({
  auction: {
    id: 'a1',
    title: 'Brass Vase',
    category: 'Decor',
    coverImage: null,
    startingBidPaise: 100000,
    currentBidPaise: 150000,
    bidCount: 2,
    startTime: '2026-01-01T00:00:00Z',
    endTime: '2099-01-01T00:00:00Z',
    status: 'LIVE',
    seller: { name: 'Sam' },
  },
  myHighestBidPaise: 140000,
  myMaxBidPaise: 200000,
  myBidCount: 2,
  lastBidAt: '2026-01-02T00:00:00Z',
  state: 'OUTBID',
  ...over,
});

const result = (items: unknown[], over: object = {}) => ({
  desktop: { isLoading: false, data: { items, meta: { total: items.length, page: 1, pageSize: 10, totalPages: 1 } } },
  mobile: { isLoading: false, hasNextPage: false, isFetchingNextPage: false, fetchNextPage: vi.fn() },
  mobileItems: items,
  error: null,
  refetch: vi.fn(),
  ...over,
});

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MyBidsPage />
    </QueryClientProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  m.qs = '';
  m.useMyBids.mockReturnValue(result([]));
});

describe('My bids page', () => {
  it('shows the header and the Winning tab by default', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'My bids' })).toBeInTheDocument();
    expect(m.useMyBids).toHaveBeenCalledWith('winning', 1, 10);
    expect(screen.getAllByText('Not winning anything yet').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Browse auctions' })[0]).toHaveAttribute('href', '/auctions');
    expect(screen.getAllByRole('link', { name: 'Browse auctions' })).toHaveLength(2); // desktop + narrow empty state, none in the header
  });

  it('reads the tab, page and size from the URL and ignores an invalid tab', () => {
    m.qs = 'tab=won&page=2&pageSize=25';
    const { unmount } = renderPage();
    expect(m.useMyBids).toHaveBeenLastCalledWith('won', 2, 25);
    unmount();
    m.qs = 'tab=bogus';
    renderPage();
    expect(m.useMyBids).toHaveBeenLastCalledWith('winning', 1, 10);
  });

  it('writes the tab to the URL', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('tab', { name: 'Outbid' }));
    expect(m.replace).toHaveBeenCalledWith('/my-bids?tab=outbid', { scroll: false });
  });

  it('offers View and Bid again for a live outbid auction', async () => {
    m.useMyBids.mockReturnValue(result([row()]));
    renderPage();
    expect(screen.getAllByRole('link', { name: /Brass Vase/ })[0]).toHaveAttribute('href', '/auctions/a1');
    await userEvent.click(screen.getAllByRole('button', { name: 'Actions for Brass Vase' })[0]);
    const menu = await screen.findByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: 'View' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Bid again' })).toBeInTheDocument();
  });

  it('offers Seller contact for a won auction without a sale', async () => {
    m.useMyBids.mockReturnValue(result([row({ state: 'WON', saleId: null })]));
    renderPage();
    await userEvent.click(screen.getAllByRole('button', { name: 'Actions for Brass Vase' })[0]);
    expect(await screen.findByRole('menuitem', { name: 'Seller contact' })).toBeInTheDocument();
  });

  it('shows the shared error state with Try again', async () => {
    const refetch = vi.fn();
    m.useMyBids.mockReturnValue(
      result([], { error: new Error('x'), refetch, desktop: { isLoading: false, data: undefined }, mobile: { isLoading: false, data: undefined } }),
    );
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });
});
