import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as featuredApi from '../featured.api';
import type { AuctionCard } from '@/features/auctions/auctions.types';
import { PromotedStrip } from './promoted-strip';

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => <img src={src as string} alt={alt} />,
}));
vi.mock('@/features/watchlist/components/watch-button', () => ({ WatchButton: () => null }));
vi.mock('../featured.api');

const card = (id: string, title: string): AuctionCard => ({
  id,
  title,
  category: 'Art',
  condition: 'USED',
  coverImage: null,
  startingBidPaise: 100000,
  currentBidPaise: 0,
  bidCount: 0,
  startTime: new Date(Date.now() - 3_600_000).toISOString(),
  endTime: new Date(Date.now() + 3_600_000).toISOString(),
  status: 'LIVE',
  seller: { id: 's1', name: 'Sam', avatarUrl: null },
  buyNowPricePaise: null,
  hasReserve: false,
  reserveMet: false,
  promoted: true,
});

const wrap = (category: string) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PromotedStrip category={category} />
    </QueryClientProvider>,
  );

beforeEach(() => vi.clearAllMocks());

describe('PromotedStrip', () => {
  it('shows a Promoted heading and the promoted auctions (with the badge) for a category', async () => {
    vi.mocked(featuredApi.fetchPromoted).mockResolvedValue([card('a1', 'Brass Vase'), card('a2', 'Oil Painting')]);
    wrap('art');
    expect(await screen.findByRole('heading', { name: 'Promoted' })).toBeInTheDocument();
    expect(screen.getByText('Brass Vase')).toBeInTheDocument();
    expect(screen.getByText('Oil Painting')).toBeInTheDocument();
    expect(screen.getAllByText('Promoted').length).toBeGreaterThan(2);
    expect(featuredApi.fetchPromoted).toHaveBeenCalledWith('art');
  });

  it('does not query or render without a category', () => {
    wrap('');
    expect(featuredApi.fetchPromoted).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'Promoted' })).not.toBeInTheDocument();
  });

  it('renders nothing when there are no promoted auctions', async () => {
    vi.mocked(featuredApi.fetchPromoted).mockResolvedValue([]);
    wrap('art');
    await vi.waitFor(() => expect(featuredApi.fetchPromoted).toHaveBeenCalled());
    expect(screen.queryByRole('heading', { name: 'Promoted' })).not.toBeInTheDocument();
  });
});
