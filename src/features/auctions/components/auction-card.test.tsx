import { render, screen } from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { AuctionCard as AuctionCardData } from '../auctions.types';
import { AuctionCard, AuctionStatusBadge } from './auction-card';

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => <img src={src as string} alt={alt} />,
}));
vi.mock('@/features/watchlist/components/watch-button', () => ({ WatchButton: () => <button aria-label="Add to watchlist" /> }));

const HOUR = 3_600_000;
const card = (over: Partial<AuctionCardData> = {}): AuctionCardData => ({
  id: 'a1',
  title: 'Brass Vase',
  category: 'Antiques',
  condition: 'USED',
  coverImage: 'https://cdn.example.com/a.jpg',
  startingBidPaise: 100000,
  currentBidPaise: 0,
  bidCount: 0,
  startTime: new Date(Date.now() - HOUR).toISOString(),
  endTime: new Date(Date.now() + HOUR).toISOString(),
  status: 'LIVE',
  seller: { id: 's1', name: 'Sam Seller', avatarUrl: null },
  ...over,
});

describe('AuctionCard', () => {
  it('shows the starting bid before any bids', () => {
    render(<AuctionCard auction={card()} />);
    expect(screen.getByText('Starting bid')).toBeInTheDocument();
    expect(screen.getByText('₹1,000')).toBeInTheDocument();
    expect(screen.getByText('0 bids')).toBeInTheDocument();
  });

  it('shows the current bid once there are bids (singular/plural count)', () => {
    const { rerender } = render(<AuctionCard auction={card({ bidCount: 1, currentBidPaise: 125050 })} />);
    expect(screen.getByText('Current bid')).toBeInTheDocument();
    expect(screen.getByText('₹1,250.50')).toBeInTheDocument();
    expect(screen.getByText('1 bid')).toBeInTheDocument();
    rerender(<AuctionCard auction={card({ bidCount: 4, currentBidPaise: 125050 })} />);
    expect(screen.getByText('4 bids')).toBeInTheDocument();
  });

  it('links to the auction and the seller profile', () => {
    render(<AuctionCard auction={card()} />);
    expect(screen.getByRole('link', { name: /Brass Vase/ })).toHaveAttribute('href', '/auctions/a1');
    expect(screen.getByRole('link', { name: /Sam Seller/ })).toHaveAttribute('href', '/sellers/s1');
  });

  it('renders the cover image, or a placeholder when missing', () => {
    const { rerender } = render(<AuctionCard auction={card()} />);
    expect(screen.getByAltText('Brass Vase')).toHaveAttribute('src', 'https://cdn.example.com/a.jpg');
    rerender(<AuctionCard auction={card({ coverImage: null })} />);
    expect(screen.queryByAltText('Brass Vase')).not.toBeInTheDocument();
  });

  it('shows the status badge', () => {
    render(<AuctionCard auction={card({ status: 'SCHEDULED' })} />);
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
  });
});

describe('AuctionStatusBadge', () => {
  it.each([
    ['LIVE', 'Live'],
    ['SCHEDULED', 'Upcoming'],
    ['ENDED', 'Ended'],
    ['CANCELLED', 'Cancelled'],
  ] as const)('%s -> %s', (status, label) => {
    render(<AuctionStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
