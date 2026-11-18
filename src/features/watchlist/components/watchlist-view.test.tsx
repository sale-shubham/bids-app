import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ useWatchlist: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/watchlist',
  useSearchParams: () => new URLSearchParams(''),
}));
vi.mock('@/hooks/use-is-narrow-content', () => ({ useIsNarrowContent: () => false }));
vi.mock('../use-watchlist', () => ({
  useWatchlist: m.useWatchlist,
  useToggleWatch: () => ({ mutate: vi.fn() }),
}));

import { WatchlistView } from './watchlist-view';

beforeEach(() => {
  m.useWatchlist.mockReturnValue({
    desktop: { isLoading: false, data: { items: [], meta: { total: 0, page: 1, pageSize: 10, totalPages: 1 } } },
    mobile: { isLoading: false, hasNextPage: false, isFetchingNextPage: false, fetchNextPage: vi.fn() },
    mobileItems: [],
    error: null,
    refetch: vi.fn(),
  });
});

describe('WatchlistView', () => {
  it('empty state links to Browse auctions', () => {
    render(<WatchlistView />);
    expect(screen.getAllByText('Nothing on your watchlist yet').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Browse auctions' })[0]).toHaveAttribute('href', '/auctions');
  });
});
