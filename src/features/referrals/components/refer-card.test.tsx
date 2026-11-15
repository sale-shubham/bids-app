import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as referralsApi from '../referrals.api';
import { CreditLedger } from './credit-ledger';
import { ReferCard } from './refer-card';

const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('../referrals.api');

const summary = {
  code: 'NOBLE7',
  link: 'https://app.example.com/signup?ref=NOBLE7',
  rewardPaise: 10000,
  enabled: true,
  counts: { pending: 2, qualified: 1, rewarded: 3, rejected: 0 },
  creditBalancePaise: 25000,
};

const wrap = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

beforeEach(() => vi.clearAllMocks());

describe('ReferCard', () => {
  it('shows the code, reward explanation, counts and balance', async () => {
    vi.mocked(referralsApi.fetchReferral).mockResolvedValue(summary);
    wrap(<ReferCard />);
    expect(await screen.findByText('NOBLE7')).toBeInTheDocument();
    expect(screen.getByText(/Earn ₹100 in credits when a friend you invite completes their first purchase or sale/)).toBeInTheDocument();
    expect(screen.getByText(/Credits pay for promotions and commission/)).toBeInTheDocument();
    expect(screen.getByText('Pending').nextSibling).toHaveTextContent('2');
    expect(screen.getByText('Rewarded').nextSibling).toHaveTextContent('3');
    expect(screen.getByText('₹250')).toBeInTheDocument();
  });

  it('copies the invite link', async () => {
    vi.mocked(referralsApi.fetchReferral).mockResolvedValue(summary);
    const user = userEvent.setup();
    wrap(<ReferCard />);
    await user.click(await screen.findByRole('button', { name: 'Copy link' }));
    expect(await navigator.clipboard.readText()).toBe(summary.link);
    expect(toast.success).toHaveBeenCalledWith('Link copied');
  });
});

describe('CreditLedger', () => {
  it('lists credits and debits with signs and reason labels', async () => {
    vi.mocked(referralsApi.fetchCredits).mockResolvedValue({
      items: [
        { id: 'c1', amountPaise: 10000, reason: 'REFERRAL_REWARD', note: 'Friend joined', createdAt: '2026-11-01T00:00:00Z' },
        { id: 'c2', amountPaise: -24900, reason: 'FEATURE_PURCHASE', note: null, createdAt: '2026-11-02T00:00:00Z' },
      ],
      meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
    });
    wrap(<CreditLedger />);
    expect(await screen.findByText('Referral reward')).toBeInTheDocument();
    expect(screen.getByText('+₹100')).toBeInTheDocument();
    expect(screen.getByText('Promotion')).toBeInTheDocument();
    expect(screen.getByText('-₹249')).toBeInTheDocument();
    expect(screen.getByText('Friend joined')).toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    vi.mocked(referralsApi.fetchCredits).mockResolvedValue({ items: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 1 } });
    wrap(<CreditLedger />);
    expect(await screen.findByText('No credits yet')).toBeInTheDocument();
  });
});
