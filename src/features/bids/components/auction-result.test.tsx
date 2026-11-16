import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { AuctionDetail } from '@/features/auctions/auctions.types';
import { useAuthStore, type AuthMember } from '@/store/auth-store';
import { AuctionResult } from './auction-result';

const ended = (over: Partial<AuctionDetail> = {}): AuctionDetail =>
  ({
    id: 'a1',
    status: 'ENDED',
    bidCount: 0,
    currentBidPaise: 0,
    winnerId: null,
    hasReserve: false,
    reserveMet: false,
    seller: { id: 'seller1', name: 'Sam', avatarUrl: null },
    ...over,
  }) as unknown as AuctionDetail;
const signIn = (id: string | null) => useAuthStore.setState({ member: id ? ({ id, role: 'MEMBER' } as AuthMember) : null, initialized: true });

beforeEach(() => signIn(null));

describe('AuctionResult', () => {
  it('sold when there is a winner', () => {
    render(<AuctionResult auction={ended({ bidCount: 3, currentBidPaise: 250000, winnerId: 'u9' })} />);
    expect(screen.getByText('Sold for ₹2,500')).toBeInTheDocument();
  });

  it('bids but no winner and reserve not met: not sold, with Relist for the seller', () => {
    signIn('seller1');
    render(<AuctionResult auction={ended({ bidCount: 2, currentBidPaise: 120000, hasReserve: true })} />);
    expect(screen.getByText('Reserve not met — not sold')).toBeInTheDocument();
    expect(screen.queryByText(/Sold for/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Relist/ })).toHaveAttribute('href', '/sell/new?from=a1');
  });

  it('bidders do not get a Relist link', () => {
    signIn('u1');
    render(<AuctionResult auction={ended({ bidCount: 2, hasReserve: true })} />);
    expect(screen.getByText('Reserve not met — not sold')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Relist/ })).not.toBeInTheDocument();
  });

  it('no bids: seller can relist', () => {
    signIn('seller1');
    render(<AuctionResult auction={ended()} />);
    expect(screen.getByText('Ended with no bids')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Relist/ })).toBeInTheDocument();
  });
});
