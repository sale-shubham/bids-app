import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as riskApi from '@/features/risk/risk.api';
import type { RiskSignal } from '@/features/risk/risk.types';
import { riskReasonLabel, riskScoreVariant } from '@/features/risk/risk.utils';
import AdminRiskPage from './page';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/features/risk/risk.api');
const search = vi.hoisted(() => ({ q: '' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/admin/risk',
  useSearchParams: () => new URLSearchParams(search.q),
}));
vi.mock('@/hooks/use-is-narrow-content', () => ({ useIsNarrowContent: () => false }));

const signal = (over: Partial<RiskSignal> = {}): RiskSignal => ({
  id: 'r1',
  auction: { id: 'a1', title: 'Brass Vase' },
  bidder: { id: 'b1', name: 'Bea Bidder', email: 'bea@example.com' },
  seller: { id: 's1', name: 'Sam Seller', email: 'sam@example.com' },
  score: 85,
  reasons: ['SHARED_DEVICE', 'NEVER_WINS'],
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-02T00:00:00Z',
  reviewedAt: null,
  outcome: null,
  note: null,
  ...over,
});
const page = (s: RiskSignal) => ({ items: [s], meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 } });

async function pick(name: string) {
  await userEvent.click(await screen.findByRole('button', { name: 'Actions for Brass Vase' }));
  await userEvent.click(await screen.findByRole('menuitem', { name }));
}

function setup() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AdminRiskPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  search.q = '';
  vi.mocked(riskApi.fetchRisk).mockResolvedValue(page(signal()));
  vi.mocked(riskApi.reviewRisk).mockResolvedValue({});
});

describe('risk helpers', () => {
  it('labels known reasons readably and passes unknown ones through', () => {
    expect(riskReasonLabel('SHARED_DEVICE')).toMatch(/share a device/);
    expect(riskReasonLabel('SOMETHING_NEW')).toBe('something new');
  });
  it('colours the score by band', () => {
    expect(riskScoreVariant(90)).toBe('destructive');
    expect(riskScoreVariant(50)).toBe('warning');
    expect(riskScoreVariant(10)).toBe('secondary');
  });
});

describe('AdminRiskPage', () => {
  it('has a title-only header and Open/Reviewed tabs', async () => {
    setup();
    expect(await screen.findByRole('heading', { name: 'Shill-bid risk' })).toBeInTheDocument();
    expect(screen.queryByText(/blocks nothing/)).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Open' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Reviewed' })).toBeInTheDocument();
  });

  it('requests the open queue and shows score, reasons and links', async () => {
    setup();
    expect(await screen.findByLabelText('Risk score 85')).toBeInTheDocument();
    expect(riskApi.fetchRisk).toHaveBeenCalledWith({ tab: 'open' }, 1, 10);
    expect(screen.getByText(/Bidder and seller share a device/)).toBeInTheDocument();
    expect(screen.getByText(/Bids often but never wins/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Brass Vase' })).toHaveAttribute('href', '/auctions/a1');
    expect(screen.getByRole('link', { name: 'Bea Bidder' })).toHaveAttribute('href', '/admin/members?q=bea%40example.com');
    expect(screen.getByRole('link', { name: 'Sam Seller' })).toHaveAttribute('href', '/admin/members?q=sam%40example.com');
  });

  it('Dismiss confirms first, then sends DISMISSED', async () => {
    setup();
    await pick('Dismiss');
    expect(riskApi.reviewRisk).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Dismiss' }));
    await waitFor(() => expect(riskApi.reviewRisk).toHaveBeenCalled());
    expect(vi.mocked(riskApi.reviewRisk).mock.calls[0][0]).toEqual({ id: 'r1', outcome: 'DISMISSED' });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Flag dismissed'));
  });

  it('Mark action taken sends the optional note', async () => {
    setup();
    await pick('Mark action taken');
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Note (optional)'), 'Cancelled the auction');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark action taken' }));
    await waitFor(() => expect(riskApi.reviewRisk).toHaveBeenCalled());
    expect(vi.mocked(riskApi.reviewRisk).mock.calls[0][0]).toEqual({ id: 'r1', outcome: 'ACTION_TAKEN', note: 'Cancelled the auction' });
  });

  it('RISK_ALREADY_REVIEWED toasts the mapped copy', async () => {
    const { AxiosError } = await import('axios');
    const err = new AxiosError('x');
    err.response = { status: 409, data: { success: false, error: { code: 'RISK_ALREADY_REVIEWED', message: 'm' } } } as never;
    vi.mocked(riskApi.reviewRisk).mockRejectedValue(err);
    setup();
    await pick('Dismiss');
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Dismiss' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('This risk flag was already reviewed.'));
  });

  it('Reviewed tab shows the outcome and no actions', async () => {
    search.q = 'tab=reviewed';
    vi.mocked(riskApi.fetchRisk).mockResolvedValue(page(signal({ reviewedAt: '2026-11-03T00:00:00Z', outcome: 'ACTION_TAKEN', note: 'Suspended bidder' })));
    setup();
    expect(await screen.findByText(/Action taken/)).toBeInTheDocument();
    expect(riskApi.fetchRisk).toHaveBeenCalledWith({ tab: 'reviewed' }, 1, 10);
    expect(screen.getByText(/Suspended bidder/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Brass Vase' }));
    expect(await screen.findByRole('menuitem', { name: 'View auction' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Dismiss' })).not.toBeInTheDocument();
  });
});
