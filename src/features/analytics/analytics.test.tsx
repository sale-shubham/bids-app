import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore, type AuthMember } from '@/store/auth-store';
import * as api from './analytics.api';
import { AuctionAnalyticsSection } from './components/auction-analytics-section';
import { SellerAnalyticsPage } from './components/seller-analytics-page';
import { resetTrackedViews, useTrackAuctionView } from './use-analytics';

vi.mock('./analytics.api', async (orig) => ({ ...(await orig<typeof import('./analytics.api')>()), fetchSellerAnalytics: vi.fn(), fetchAuctionAnalytics: vi.fn(), recordAuctionView: vi.fn() }));
// Recharts needs real layout; the chart itself is not under test.
vi.mock('./components/analytics-charts', () => ({ DailyChart: () => <div data-testid="chart" /> }));

function wrap(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, ...render(ui, { wrapper: Wrapper }) };
}

const seller = (over = {}) => ({
  range: { from: '2026-10-17', to: '2026-11-16' },
  totals: { views: 120, uniqueViewers: 80, watchers: 9, bids: 14, bidders: 6, sold: 2, revenuePaise: 450000 },
  daily: [{ date: '2026-11-15', views: 10, bids: 1 }],
  auctions: [
    { id: 'a1', title: 'Brass lamp', status: 'LIVE', views: 20, uniqueViewers: 15, watchers: 2, bids: 3, bidders: 2, currentBidPaise: 100000 },
    { id: 'a2', title: 'Old clock', status: 'ENDED', views: 100, uniqueViewers: 65, watchers: 7, bids: 11, bidders: 4, currentBidPaise: 350000 },
  ],
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  resetTrackedViews();
  useAuthStore.setState({ member: null, initialized: true });
});

describe('SellerAnalyticsPage', () => {
  it('renders tiles, chart and a sortable table linking to the manage page', async () => {
    vi.mocked(api.fetchSellerAnalytics).mockResolvedValue(seller());
    wrap(<SellerAnalyticsPage />);
    expect(await screen.findByText('Unique viewers')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('₹4,500')).toBeInTheDocument();
    expect(screen.getByTestId('chart')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Brass lamp' })).toHaveAttribute('href', '/sell/auctions/a1');
    const firstTitle = () => within(screen.getAllByRole('row')[1]).getByRole('link').textContent;
    expect(firstTitle()).toBe('Brass lamp');
    await userEvent.click(screen.getByRole('columnheader', { name: /Views/ }));
    await userEvent.click(screen.getByRole('columnheader', { name: /Views/ }));
    expect(firstTitle()).toBe('Old clock');
  });

  it('switching the day range refetches under a new query key', async () => {
    vi.mocked(api.fetchSellerAnalytics).mockResolvedValue(seller());
    const { client } = wrap(<SellerAnalyticsPage />);
    await screen.findByText('Unique viewers');
    expect(api.fetchSellerAnalytics).toHaveBeenCalledWith(30);
    await userEvent.click(screen.getByRole('button', { name: '7 days' }));
    await waitFor(() => expect(api.fetchSellerAnalytics).toHaveBeenCalledWith(7));
    expect(client.getQueryData(['analytics', 'seller', 7])).toBeTruthy();
    expect(screen.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows an empty state with no data', async () => {
    vi.mocked(api.fetchSellerAnalytics).mockResolvedValue(
      seller({ totals: { views: 0, uniqueViewers: 0, watchers: 0, bids: 0, bidders: 0, sold: 0, revenuePaise: 0 }, daily: [], auctions: [] }),
    );
    wrap(<SellerAnalyticsPage />);
    expect(await screen.findByText('No activity yet')).toBeInTheDocument();
    expect(screen.queryByTestId('chart')).not.toBeInTheDocument();
  });
});

describe('AuctionAnalyticsSection', () => {
  it('shows the empty state when the auction has no activity', async () => {
    vi.mocked(api.fetchAuctionAnalytics).mockResolvedValue({
      auction: { id: 'a1', title: 'Lamp', status: 'LIVE' },
      totals: { views: 0, uniqueViewers: 0, watchers: 0, bids: 0, bidders: 0 },
      daily: [],
    });
    wrap(<AuctionAnalyticsSection auctionId="a1" />);
    expect(await screen.findByText('No activity yet')).toBeInTheDocument();
    expect(api.fetchAuctionAnalytics).toHaveBeenCalledWith('a1', 30);
  });

  it('shows totals and the chart when there is activity', async () => {
    vi.mocked(api.fetchAuctionAnalytics).mockResolvedValue({
      auction: { id: 'a1', title: 'Lamp', status: 'LIVE' },
      totals: { views: 42, uniqueViewers: 30, watchers: 3, bids: 5, bidders: 2 },
      daily: [{ date: '2026-11-15', views: 4, uniqueViewers: 3, bids: 1 }],
    });
    wrap(<AuctionAnalyticsSection auctionId="a1" />);
    expect(await screen.findByText('42')).toBeInTheDocument();
    expect(screen.getByTestId('chart')).toBeInTheDocument();
  });
});

describe('useTrackAuctionView', () => {
  it('records one view per auction per page load', () => {
    vi.mocked(api.recordAuctionView).mockResolvedValue();
    const { rerender } = renderHook(({ id }) => useTrackAuctionView(id, 's1'), { initialProps: { id: 'a1' } });
    rerender({ id: 'a1' });
    renderHook(() => useTrackAuctionView('a1', 's1'));
    expect(api.recordAuctionView).toHaveBeenCalledTimes(1);
    rerender({ id: 'a2' });
    expect(api.recordAuctionView).toHaveBeenCalledTimes(2);
  });

  it('skips the seller and swallows failures', () => {
    useAuthStore.setState({ member: { id: 's1', role: 'MEMBER' } as AuthMember, initialized: true });
    renderHook(() => useTrackAuctionView('a1', 's1'));
    expect(api.recordAuctionView).not.toHaveBeenCalled();

    useAuthStore.setState({ member: null, initialized: true });
    vi.mocked(api.recordAuctionView).mockRejectedValue(new Error('offline'));
    expect(() => renderHook(() => useTrackAuctionView('a9', 's1'))).not.toThrow();
    expect(api.recordAuctionView).toHaveBeenCalledWith('a9');
  });
});
