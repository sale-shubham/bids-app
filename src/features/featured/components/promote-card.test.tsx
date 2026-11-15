import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as featuredApi from '../featured.api';
import * as paymentsApi from '@/features/payments/payments.api';
import { PromoteCard } from './promote-card';

const state = vi.hoisted(() => ({ settings: undefined as unknown, balance: 0 }));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('../featured.api');
vi.mock('@/features/payments/payments.api');
vi.mock('@/features/settings/use-settings', () => ({ usePublicSettings: () => ({ data: state.settings }) }));
vi.mock('@/features/referrals/use-referrals', () => ({
  useCreditBalance: () => state.balance,
  REFERRAL_KEY: ['referral'],
  CREDITS_KEY: ['credits'],
}));

const settings = (over = {}) => ({ featuredEnabled: true, featuredPrices: { '1': 9900, '3': 24900, '7': 49900 }, ...over });

function setup(status = 'LIVE') {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <PromoteCard auctionId="a1" status={status} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  state.settings = settings();
  state.balance = 0;
  vi.mocked(featuredApi.fetchAuctionFeature).mockResolvedValue({ featuredUntil: null, purchases: [] });
});

describe('PromoteCard', () => {
  it('is hidden when promotions are disabled or the auction ended', () => {
    state.settings = settings({ featuredEnabled: false });
    const { container } = render(
      <QueryClientProvider client={new QueryClient()}>
        <PromoteCard auctionId="a1" status="LIVE" />
      </QueryClientProvider>,
    );
    expect(container).toBeEmptyDOMElement();
    state.settings = settings();
    setup('ENDED');
    expect(screen.queryByText('Promote this auction')).not.toBeInTheDocument();
  });

  it('shows the options with prices, the current promotion and purchase history', async () => {
    vi.mocked(featuredApi.fetchAuctionFeature).mockResolvedValue({
      featuredUntil: new Date(Date.now() + 86_400_000).toISOString(),
      purchases: [{ id: 'p1', days: 3, amountPaise: 24900, status: 'PAID', paidWith: 'CREDITS', paidAt: '2026-11-10T00:00:00Z', createdAt: '2026-11-10T00:00:00Z' }],
    });
    setup();
    expect(await screen.findByText(/Promoted until/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /1 day/ })).toHaveTextContent('₹99');
    expect(screen.getByRole('radio', { name: /7 days/ })).toHaveTextContent('₹499');
    expect(await screen.findByText(/3 days · ₹249 \(credits\)/)).toBeInTheDocument();
  });

  it('shows the credits checkbox only when the balance covers the price', async () => {
    state.balance = 10000;
    setup();
    await userEvent.click(screen.getByRole('radio', { name: /1 day/ }));
    expect(screen.getByLabelText(/Pay with credits \(balance ₹100\)/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: /7 days/ }));
    expect(screen.queryByLabelText(/Pay with credits/)).not.toBeInTheDocument();
  });

  it('pays with credits after confirming', async () => {
    state.balance = 100000;
    vi.mocked(featuredApi.createFeatureCheckout).mockResolvedValue({ paidWithCredits: true, featuredUntil: '2026-11-20T00:00:00Z' });
    setup();
    await userEvent.click(screen.getByLabelText(/Pay with credits/));
    await userEvent.click(screen.getByRole('button', { name: /Pay ₹249 with credits/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Pay with credits' }));
    await waitFor(() => expect(featuredApi.createFeatureCheckout).toHaveBeenCalledWith('a1', { days: 3, useCredits: true }));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it('pays through Razorpay checkout (test mode confirm) and verifies the FEATURE payment', async () => {
    vi.mocked(featuredApi.createFeatureCheckout).mockResolvedValue({
      orderId: 'order_1',
      amountPaise: 24900,
      currency: 'INR',
      keyId: 'stub',
      description: 'Promotion',
      prefill: {},
    });
    vi.mocked(paymentsApi.verifyPayment).mockResolvedValue({ referenceType: 'FEATURE' });
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Pay ₹249' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Simulate payment' }));
    await waitFor(() => expect(paymentsApi.verifyPayment).toHaveBeenCalled());
    expect(featuredApi.createFeatureCheckout).toHaveBeenCalledWith('a1', { days: 3 });
    expect(vi.mocked(paymentsApi.verifyPayment).mock.calls[0][0]).toMatchObject({ orderId: 'order_1', signature: 'stub' });
  });
});
