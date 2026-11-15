import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ImgHTMLAttributes } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as commissionsApi from '@/features/commissions/commissions.api';
import SellCommissionsPage from './page';

const state = vi.hoisted(() => ({ balance: 0 }));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => <img src={src as string} alt={alt} />,
}));
vi.mock('@/features/commissions/commissions.api');
vi.mock('@/features/referrals/use-referrals', () => ({
  useCreditBalance: () => state.balance,
  REFERRAL_KEY: ['referral'],
  CREDITS_KEY: ['credits'],
}));

const commission = {
  id: 'c1',
  auctionId: 'a1',
  auction: { id: 'a1', title: 'Brass Vase', coverImage: null, finalBidPaise: 100000, endedAt: null },
  rateBps: 500,
  amountPaise: 5000,
  status: 'DUE' as const,
  dueAt: null,
  paidAt: null,
  createdAt: '2026-11-01T00:00:00Z',
  isOverdue: false,
};

const setup = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SellCommissionsPage />
    </QueryClientProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  state.balance = 0;
  vi.mocked(commissionsApi.fetchCommissions).mockResolvedValue({ items: [commission], meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 } });
  vi.mocked(commissionsApi.fetchCommissionSummary).mockResolvedValue({ unpaidPaise: 5000, dueCount: 1, overdueCount: 0 });
  vi.mocked(commissionsApi.payCommissionWithCredits).mockResolvedValue(undefined);
});

describe('Commission pay with credits', () => {
  it('hides the option when the balance is too low', async () => {
    state.balance = 1000;
    setup();
    await screen.findByText('Brass Vase');
    expect(screen.queryByLabelText(/Pay with credits/)).not.toBeInTheDocument();
  });

  it('pays with credits after confirming', async () => {
    state.balance = 20000;
    setup();
    await userEvent.click(await screen.findByLabelText(/Pay with credits \(balance ₹200\)/));
    await userEvent.click(screen.getByRole('button', { name: 'Pay ₹50' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Pay with credits' }));
    await waitFor(() => expect(vi.mocked(commissionsApi.payCommissionWithCredits).mock.calls[0]?.[0]).toBe('c1'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Commission paid with credits.'));
    expect(commissionsApi.createCommissionCheckout).not.toHaveBeenCalled();
  });
});
