import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ImgHTMLAttributes } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as auctionsApi from '@/features/auctions/auctions.api';
import type { AuctionCard } from '@/features/auctions/auctions.types';
import SellAuctionsPage from './page';

const nav = vi.hoisted(() => ({ search: '', replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace }),
  usePathname: () => '/sell/auctions',
  useSearchParams: () => new URLSearchParams(nav.search),
}));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => <img src={src as string} alt={alt} />,
}));
vi.mock('@/features/auctions/auctions.api');
vi.mock('@/features/auctions/components/republish-dialog', () => ({ RepublishDialog: () => null }));

const HOUR = 3_600_000;
const auction = (over: Partial<AuctionCard> = {}): AuctionCard => ({
  id: 'a1',
  title: 'Brass Vase',
  category: 'Antiques',
  condition: 'USED',
  coverImage: null,
  startingBidPaise: 100000,
  currentBidPaise: 0,
  bidCount: 0,
  startTime: new Date(Date.now() - HOUR).toISOString(),
  endTime: new Date(Date.now() + HOUR).toISOString(),
  status: 'LIVE',
  seller: { id: 's1', name: 'Sam', avatarUrl: null },
  buyNowPricePaise: null,
  hasReserve: false,
  reserveMet: false,
  ...over,
});
const pageOf = (a: AuctionCard) => ({ items: [a], nextCursor: null, meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 } }) as never;

const setup = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SellAuctionsPage />
    </QueryClientProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  nav.search = '';
  vi.mocked(auctionsApi.fetchMyAuctions).mockResolvedValue(pageOf(auction()));
});

describe('SellAuctionsPage', () => {
  it('has the common header with New auction as the action, and Live (the first tab) active by default', async () => {
    setup();
    expect(screen.getByRole('heading', { name: 'My auctions' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /New auction/ })).toHaveAttribute('href', '/sell/new');
    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveTextContent('Live');
    expect(tabs[0]).toHaveAttribute('data-state', 'active');
    await screen.findByText('Brass Vase');
    expect(vi.mocked(auctionsApi.fetchMyAuctions).mock.calls[0]?.[0]).toBe('live');
  });

  it('reads the tab from the URL, falls back on an unknown value, and writes a picked tab to the URL', async () => {
    nav.search = 'status=ended';
    const { unmount } = setup();
    expect(screen.getByRole('tab', { name: 'Ended' })).toHaveAttribute('data-state', 'active');
    await waitFor(() => expect(vi.mocked(auctionsApi.fetchMyAuctions).mock.calls[0]?.[0]).toBe('ended'));
    unmount();

    nav.search = 'status=nope';
    setup();
    expect(screen.getByRole('tab', { name: 'Live' })).toHaveAttribute('data-state', 'active');
    await userEvent.click(screen.getByRole('tab', { name: 'Upcoming' }));
    expect(nav.replace).toHaveBeenCalledWith('/sell/auctions?status=upcoming', { scroll: false });
  });

  it('keeps row actions in one menu, with Delete opening the confirm dialog', async () => {
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Brass Vase' }));
    expect(screen.getByRole('menuitem', { name: 'Bids' })).toHaveAttribute('href', '/sell/auctions/a1');
    expect(screen.getByRole('menuitem', { name: 'View' })).toHaveAttribute('href', '/auctions/a1');
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveAttribute('href', '/sell/auctions/a1/edit');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(await screen.findByText('Delete this auction?')).toBeInTheDocument();
  });

  it('offers no Edit or Delete once there are bids', async () => {
    vi.mocked(auctionsApi.fetchMyAuctions).mockResolvedValue(pageOf(auction({ bidCount: 2 })));
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Brass Vase' }));
    expect(screen.queryByRole('menuitem', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument();
  });
});
