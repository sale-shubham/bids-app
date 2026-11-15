import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuctionDetail } from '@/features/auctions/auctions.types';

const state = vi.hoisted(() => ({ member: { id: 'me' } as { id: string } | null }));
vi.mock('@/store/auth-store', () => ({ useAuthStore: (sel: (s: typeof state) => unknown) => sel(state) }));
vi.mock('@/features/reviews/components/rate-seller-button', () => ({ RateSellerButton: () => null }));
vi.mock('@/features/reviews/components/star-rating', () => ({ StarDisplay: () => null }));

import { AuctionResult } from './auction-result';

const auction = (over: Partial<AuctionDetail> = {}) =>
  ({
    id: 'a1',
    status: 'ENDED',
    winnerId: 'me',
    bidCount: 3,
    hasReserve: false,
    reserveMet: false,
    currentBidPaise: 250000,
    seller: { id: 'seller', name: 'Sam' },
    contact: null,
    sale: null,
    ...over,
  }) as AuctionDetail;

const contact = { role: 'SELLER' as const, name: 'Sam Seller', email: 's@x.in', phone: '9999999999' };

beforeEach(() => {
  state.member = { id: 'me' };
});

describe('AuctionResult for the winner', () => {
  it('AWAITING_PAYMENT: Pay now links to the purchase and shows the pay-by date; no seller contact', () => {
    const payBy = new Date(Date.now() + 2 * 86_400_000).toISOString();
    render(<AuctionResult auction={auction({ sale: { id: 'sale1', status: 'AWAITING_PAYMENT', payBy }, contact })} />);
    expect(screen.getByRole('link', { name: 'Pay now' })).toHaveAttribute('href', '/purchases/sale1');
    expect(screen.getByText(/Pay by/)).toBeInTheDocument();
    expect(screen.queryByText('Seller contact')).not.toBeInTheDocument();
    expect(screen.queryByText(/arrange payment and delivery/)).not.toBeInTheDocument();
  });

  it.each([
    ['PAID', 'Paid'],
    ['SHIPPED', 'Shipped'],
    ['RELEASED', 'Completed'],
    ['DISPUTED', 'Disputed'],
  ])('%s: status badge and View purchase', (status, label) => {
    render(<AuctionResult auction={auction({ sale: { id: 'sale1', status: status as 'PAID', payBy: null } })} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View purchase' })).toHaveAttribute('href', '/purchases/sale1');
    expect(screen.queryByRole('link', { name: 'Pay now' })).not.toBeInTheDocument();
  });

  it('legacy auction without a sale keeps the contact card', () => {
    render(<AuctionResult auction={auction({ contact })} />);
    expect(screen.getByText('Seller contact')).toBeInTheDocument();
    expect(screen.getByText(/arrange payment and delivery/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Pay now|View purchase/ })).not.toBeInTheDocument();
  });
});

describe('AuctionResult for the seller', () => {
  beforeEach(() => {
    state.member = { id: 'seller' };
  });

  it('with a sale: status and View sale link, no commission note', () => {
    render(<AuctionResult auction={auction({ winnerId: 'buyer', sale: { id: 'sale1', status: 'PAID', payBy: null } })} />);
    expect(screen.getByRole('link', { name: 'View sale' })).toHaveAttribute('href', '/sell/sales/sale1');
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.queryByText(/commission is due/)).not.toBeInTheDocument();
  });

  it('legacy auction without a sale: winner contact and commission link', () => {
    render(
      <AuctionResult auction={auction({ winnerId: 'buyer', contact: { role: 'WINNER', name: 'Bea', email: 'b@x.in', phone: '8888888888' } })} />,
    );
    expect(screen.getByText('Winner contact')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View commissions' })).toHaveAttribute('href', '/sell/commissions');
    expect(screen.queryByRole('link', { name: 'View sale' })).not.toBeInTheDocument();
  });
});
