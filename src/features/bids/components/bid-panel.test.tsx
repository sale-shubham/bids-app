import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuctionDetail } from '@/features/auctions/auctions.types';
import { useAuthStore, type AuthMember } from '@/store/auth-store';
import { BidPanel } from './bid-panel';

const mutate = vi.fn();
const buyMutate = vi.fn();
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('../use-bids', () => ({
  usePlaceBid: () => ({ mutate, isPending: false }),
  useBuyNow: () => ({ mutate: buyMutate, isPending: false }),
}));
vi.mock('./auction-result', () => ({ AuctionResult: () => <div>RESULT-VIEW</div> }));

const HOUR = 3_600_000;
const auction = (over: Partial<AuctionDetail> = {}): AuctionDetail =>
  ({
    id: 'a1',
    title: 'Brass Vase',
    status: 'LIVE',
    startTime: new Date(Date.now() - HOUR).toISOString(),
    endTime: new Date(Date.now() + HOUR).toISOString(),
    startingBidPaise: 100000,
    currentBidPaise: 0,
    minIncrementPaise: 10000,
    bidCount: 0,
    seller: { id: 'seller1', name: 'Sam', avatarUrl: null },
    highestBidderId: null,
    recentBids: [],
    buyNowPricePaise: null,
    hasReserve: false,
    reserveMet: false,
    myMaxBidPaise: null,
    ...over,
  }) as unknown as AuctionDetail;

const member = (over: Partial<AuthMember> = {}) => ({ id: 'me', role: 'BIDDER', ...over }) as AuthMember;
const signIn = (m: AuthMember | null) => useAuthStore.setState({ member: m, initialized: true });

function renderPanel(a: AuctionDetail) {
  const qc = new QueryClient();
  const wrap = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return { qc, ...render(<BidPanel auction={a} />, { wrapper: wrap }) };
}

beforeEach(() => {
  signIn(null);
  mutate.mockReset();
  buyMutate.mockReset();
  toast.error.mockReset();
});

describe('BidPanel states', () => {
  it('guest sees a login link that returns to the auction', async () => {
    renderPanel(auction());
    const link = await screen.findByRole('link', { name: 'Log in to bid' });
    expect(link).toHaveAttribute('href', `/login?next=${encodeURIComponent('/auctions/a1')}`);
  });

  it('shows a skeleton (no login link) until auth is initialized', () => {
    useAuthStore.setState({ member: null, initialized: false });
    renderPanel(auction());
    expect(screen.queryByRole('link', { name: 'Log in to bid' })).not.toBeInTheDocument();
  });

  it('non-bidder accounts get a note instead of controls', async () => {
    signIn(member({ role: 'AUCTIONEER' }));
    renderPanel(auction());
    expect(await screen.findByText('Only bidder accounts can bid.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Place bid' })).not.toBeInTheDocument();
  });

  it('the seller cannot bid on their own auction', async () => {
    signIn(member({ id: 'seller1' }));
    renderPanel(auction());
    expect(await screen.findByText(/This is your auction/)).toBeInTheDocument();
  });

  it('the highest bidder sees the winning banner, not controls', async () => {
    signIn(member());
    renderPanel(auction({ bidCount: 1, currentBidPaise: 100000, highestBidderId: 'me' }));
    expect(await screen.findByText(/You're the highest bidder/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Your maximum bid (₹)')).not.toBeInTheDocument();
  });

  it('upcoming auctions say bidding opens at start', async () => {
    signIn(member());
    renderPanel(auction({ status: 'SCHEDULED', startTime: new Date(Date.now() + HOUR).toISOString(), endTime: new Date(Date.now() + 2 * HOUR).toISOString() }));
    expect(await screen.findByText(/Bidding opens when the auction starts/)).toBeInTheDocument();
  });

  it('ended auctions render the result view and hide the minimum bid', async () => {
    signIn(member());
    renderPanel(auction({ status: 'ENDED' }));
    expect(await screen.findByText('RESULT-VIEW')).toBeInTheDocument();
    expect(screen.queryByText(/Minimum next bid/)).not.toBeInTheDocument();
  });

  it('past end time (status not yet flipped) shows the pending-result note', async () => {
    signIn(member());
    renderPanel(auction({ endTime: new Date(Date.now() - 5000).toISOString() }));
    expect(await screen.findByText(/final result will appear shortly/)).toBeInTheDocument();
  });
});

describe('BidPanel pricing', () => {
  it('shows the starting bid and minimum next bid with no bids', async () => {
    signIn(member());
    renderPanel(auction());
    expect(await screen.findByText('Starting bid')).toBeInTheDocument();
    expect(screen.getByText('Starting bid').nextElementSibling).toHaveTextContent('₹1,000');
    expect(screen.getByText(/Minimum next bid/).textContent).toContain('₹1,000');
    expect(screen.getByText('0 bids')).toBeInTheDocument();
  });

  it('shows current bid, current + increment as minimum, and quick amounts', async () => {
    signIn(member());
    renderPanel(auction({ bidCount: 3, currentBidPaise: 130000 }));
    expect(await screen.findByText('Current bid')).toBeInTheDocument();
    expect(screen.getByText(/Minimum next bid/).textContent).toContain('₹1,400');
    expect(screen.getByText('3 bids')).toBeInTheDocument();
    for (const amt of ['₹1,400', '₹1,500', '₹1,800']) {
      expect(screen.getAllByText(amt).length).toBeGreaterThan(0);
    }
  });

  it('flags the viewer as outbid when they have a lower highest bid', async () => {
    signIn(member());
    renderPanel(auction({ bidCount: 2, currentBidPaise: 150000, highestBidderId: 'other', myHighestBidPaise: 120000 }));
    expect(await screen.findByText('Outbid')).toBeInTheDocument();
    expect(screen.getByText(/Your highest bid/).textContent).toContain('₹1,200');
  });
});

describe('BidPanel bidding', () => {
  it('rejects non-whole and too-low custom amounts client-side', async () => {
    const user = userEvent.setup();
    signIn(member());
    renderPanel(auction());
    const input = await screen.findByLabelText('Your maximum bid (₹)');
    await user.type(input, '12.5');
    await user.click(screen.getByRole('button', { name: 'Place bid' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a whole rupee amount.');
    await user.clear(input);
    await user.type(input, '500');
    await user.click(screen.getByRole('button', { name: 'Place bid' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Bid at least ₹1,000.');
    expect(mutate).not.toHaveBeenCalled();
  });

  it('a valid custom amount opens the confirm dialog and submits paise', async () => {
    const user = userEvent.setup();
    signIn(member());
    renderPanel(auction());
    await user.type(await screen.findByLabelText('Your maximum bid (₹)'), '1,200');
    await user.click(screen.getByRole('button', { name: 'Place bid' }));
    expect(await screen.findByText('Confirm your maximum bid')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Set max ₹1,200' }));
    expect(mutate).toHaveBeenCalledWith(120000, expect.any(Object));
  });

  it('BID_TOO_LOW shows the new minimum and refetches the auction', async () => {
    const user = userEvent.setup();
    signIn(member());
    const { qc } = renderPanel(auction());
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    const err = new AxiosError('x');
    err.response = { status: 409, data: { success: false, error: { code: 'BID_TOO_LOW', message: 'low', details: { minBidPaise: 135000 } } } } as AxiosResponse;
    mutate.mockImplementation((_amt: number, opts: { onError: (e: unknown) => void }) => opts.onError(err));

    await user.click((await screen.findAllByText('₹1,100'))[0].closest('button')!); // +1x quick bid
    await user.click(await screen.findByRole('button', { name: 'Set max ₹1,100' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Someone bid before you. The minimum bid is now ₹1,350.'));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['auction', 'a1'] });
  });

  it('a successful bid clears the input (the success toast lives in usePlaceBid)', async () => {
    const user = userEvent.setup();
    signIn(member());
    renderPanel(auction());
    mutate.mockImplementation((_a: number, opts: { onSuccess: () => void }) => opts.onSuccess());
    const input = await screen.findByLabelText('Your maximum bid (₹)');
    await user.type(input, '1500');
    await user.click(screen.getByRole('button', { name: 'Place bid' }));
    await user.click(await screen.findByRole('button', { name: 'Set max ₹1,500' }));
    expect(input).toHaveValue('');
  });
});

describe('BidPanel max bidding', () => {
  it('labels the input as a maximum and explains proxy bidding', async () => {
    signIn(member());
    renderPanel(auction());
    expect(await screen.findByLabelText('Your maximum bid (₹)')).toBeInTheDocument();
    expect(screen.getByText('We bid for you, only as much as needed to keep you in the lead.')).toBeInTheDocument();
  });

  it('the confirm dialog says the amount is a maximum', async () => {
    const user = userEvent.setup();
    signIn(member());
    renderPanel(auction());
    await user.type(await screen.findByLabelText('Your maximum bid (₹)'), '1200');
    await user.click(screen.getByRole('button', { name: 'Place bid' }));
    expect(await screen.findByText(/Your maximum is ₹1,200/)).toBeInTheDocument();
  });

  it('the leader sees their max and can raise it (must exceed the current max)', async () => {
    const user = userEvent.setup();
    signIn(member());
    renderPanel(auction({ bidCount: 1, currentBidPaise: 100000, highestBidderId: 'me', myMaxBidPaise: 150000 }));
    expect(await screen.findByText(/You're the highest bidder/)).toHaveTextContent('your max ₹1,500');
    const input = screen.getByLabelText('Raise your max (₹)');
    await user.type(input, '1500');
    await user.click(screen.getByRole('button', { name: 'Raise max' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter more than your current max of ₹1,500.');
    expect(mutate).not.toHaveBeenCalled();
    await user.clear(input);
    await user.type(input, '1800');
    await user.click(screen.getByRole('button', { name: 'Raise max' }));
    await user.click(await screen.findByRole('button', { name: 'Set max ₹1,800' }));
    expect(mutate).toHaveBeenCalledWith(180000, expect.any(Object));
  });

  it('outbid by a higher proxy max: the form stays open with the typed value', async () => {
    const user = userEvent.setup();
    signIn(member());
    renderPanel(auction());
    mutate.mockImplementation((_a: number, opts: { onSuccess: (d: unknown) => void }) => opts.onSuccess({ outbidByProxy: true }));
    const input = await screen.findByLabelText('Your maximum bid (₹)');
    await user.type(input, '1500');
    await user.click(screen.getByRole('button', { name: 'Place bid' }));
    await user.click(await screen.findByRole('button', { name: 'Set max ₹1,500' }));
    expect(input).toHaveValue('1500');
    expect(screen.getByRole('button', { name: 'Place bid' })).toBeInTheDocument();
  });

  it('MAX_TOO_LOW shows the message and refetches the auction', async () => {
    const user = userEvent.setup();
    signIn(member());
    const { qc } = renderPanel(auction({ bidCount: 1, currentBidPaise: 100000, highestBidderId: 'me', myMaxBidPaise: 150000 }));
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    const err = new AxiosError('x');
    err.response = { status: 400, data: { success: false, error: { code: 'MAX_TOO_LOW', message: 'low', details: { currentMaxPaise: 160000 } } } } as AxiosResponse;
    mutate.mockImplementation((_a: number, opts: { onError: (e: unknown) => void }) => opts.onError(err));
    await user.type(await screen.findByLabelText('Raise your max (₹)'), '1700');
    await user.click(screen.getByRole('button', { name: 'Raise max' }));
    await user.click(await screen.findByRole('button', { name: 'Set max ₹1,700' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Your new maximum must be higher than your current ₹1,600.'));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['auction', 'a1'] });
  });
});

describe('BidPanel reserve badge', () => {
  it('shows "Reserve not met" / "Reserve met" only when the auction has a reserve', async () => {
    signIn(member());
    const { rerender } = renderPanel(auction({ hasReserve: true }));
    expect(await screen.findByText('Reserve not met')).toBeInTheDocument();
    rerender(<BidPanel auction={auction({ hasReserve: true, reserveMet: true })} />);
    expect(await screen.findByText('Reserve met')).toBeInTheDocument();
    rerender(<BidPanel auction={auction()} />);
    expect(screen.queryByText(/Reserve/)).not.toBeInTheDocument();
  });
});

describe('BidPanel Buy It Now', () => {
  it('confirms before buying, then calls the buy-now mutation', async () => {
    const user = userEvent.setup();
    signIn(member());
    renderPanel(auction({ buyNowPricePaise: 300000 }));
    await user.click(await screen.findByRole('button', { name: /Buy now for ₹3,000/ }));
    expect(buyMutate).not.toHaveBeenCalled();
    expect(await screen.findByText('You agree to buy this item for ₹3,000. The auction ends immediately.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Buy for ₹3,000' }));
    expect(buyMutate).toHaveBeenCalled();
  });

  it('BUY_NOW_UNAVAILABLE shows the message and refetches the auction', async () => {
    const user = userEvent.setup();
    signIn(member());
    const { qc } = renderPanel(auction({ buyNowPricePaise: 300000 }));
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    const err = new AxiosError('x');
    err.response = { status: 409, data: { success: false, error: { code: 'BUY_NOW_UNAVAILABLE', message: 'gone' } } } as AxiosResponse;
    buyMutate.mockImplementation((_v: unknown, opts: { onError: (e: unknown) => void }) => opts.onError(err));
    await user.click(await screen.findByRole('button', { name: /Buy now for/ }));
    await user.click(screen.getByRole('button', { name: 'Buy for ₹3,000' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Buy It Now is no longer available for this auction.'));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['auction', 'a1'] });
  });

  it('is hidden when no price is set', async () => {
    signIn(member());
    renderPanel(auction());
    expect(await screen.findByLabelText('Your maximum bid (₹)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Buy now/ })).not.toBeInTheDocument();
  });

  it('is not offered to the seller or guests', async () => {
    signIn(member({ id: 'seller1' }));
    const { unmount } = renderPanel(auction({ buyNowPricePaise: 300000 }));
    expect(await screen.findByText(/This is your auction/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Buy now/ })).not.toBeInTheDocument();
    unmount();
    signIn(null);
    renderPanel(auction({ buyNowPricePaise: 300000 }));
    expect(await screen.findByRole('link', { name: 'Log in to bid' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Buy now/ })).not.toBeInTheDocument();
  });
});
