import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/reports/reports.api';
import * as questionsApi from '@/features/questions/questions.api';
import { resolveReportSchema } from '@/features/reports/reports.schema';
import type { AdminReport } from '@/features/reports/reports.types';
import AdminReportsPage from './page';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/features/reports/reports.api');
vi.mock('@/features/questions/questions.api');
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/admin/reports',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/hooks/use-is-narrow-content', () => ({ useIsNarrowContent: () => false }));

const report: AdminReport = {
  id: 'r1',
  targetType: 'AUCTION',
  targetId: 'a1',
  reason: 'COUNTERFEIT',
  details: 'Looks fake',
  status: 'OPEN',
  createdAt: '2026-11-01T00:00:00Z',
  resolvedAt: null,
  note: null,
  reporter: { id: 'u1', name: 'Ravi', email: 'ravi@example.com' },
  target: { label: 'Brass Vase', url: '/auctions/a1' },
  openCountForTarget: 3,
  priority: 'HIGH',
};

async function pick(name: string, target = 'Auction Brass Vase') {
  await userEvent.click(await screen.findByRole('button', { name: `Actions for ${target}` }));
  await userEvent.click(await screen.findByRole('menuitem', { name }));
}

function setup() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AdminReportsPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.fetchAdminReports).mockResolvedValue({ items: [report], meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 } });
  vi.mocked(api.resolveReport).mockResolvedValue({ resolvedCount: 1 });
});

describe('AdminReportsPage', () => {
  it('renders a title with no description and the Open/Resolved tabs', async () => {
    setup();
    expect(await screen.findByRole('heading', { name: 'Reports' })).toBeInTheDocument();
    expect(screen.queryByText(/Reports from members/)).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Resolved' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Filters' })).toBeInTheDocument();
  });

  it('lists the report with priority, target link, reporter, reason, details and moderation link', async () => {
    setup();
    expect(await screen.findByRole('link', { name: /Brass Vase/ })).toHaveAttribute('href', '/auctions/a1');
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Fake or counterfeit item')).toBeInTheDocument();
    expect(screen.getByText('Looks fake')).toBeInTheDocument();
    expect(screen.getByText('ravi@example.com')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Auction Brass Vase' }));
    expect(await screen.findByRole('menuitem', { name: 'Cancel auction' })).toHaveAttribute('href', '/admin/auctions?q=Brass%20Vase');
  });

  it('dismisses only after confirming', async () => {
    setup();
    await pick('Dismiss');
    expect(api.resolveReport).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Dismiss' }));
    await waitFor(() => expect(api.resolveReport).toHaveBeenCalledWith({ id: 'r1', status: 'DISMISSED' }, expect.anything()));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Report dismissed'));
  });

  it('note field and schema cap at 500 characters (the API limit)', async () => {
    expect(resolveReportSchema.safeParse({ note: 'x'.repeat(500), applyToAll: false }).success).toBe(true);
    expect(resolveReportSchema.safeParse({ note: 'x'.repeat(501), applyToAll: false }).success).toBe(false);
    setup();
    await pick('Mark action taken');
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText(/Note/)).toHaveAttribute('maxlength', '500');
    expect(within(dialog).getByText('0/500')).toBeInTheDocument();
  });

  it('QUESTION reports get a Hide question shortcut behind a confirm, then refresh the list', async () => {
    const qReport: AdminReport = { ...report, id: 'r2', targetType: 'QUESTION', targetId: 'q9', target: { label: 'Is it real?', url: '/auctions/a1' } };
    vi.mocked(api.fetchAdminReports).mockResolvedValue({ items: [qReport], meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 } });
    vi.mocked(questionsApi.hideQuestion).mockResolvedValue(undefined);
    setup();
    await pick('Hide question', 'Question Is it real?');
    expect(questionsApi.hideQuestion).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Hide question' }));
    await waitFor(() => expect(questionsApi.hideQuestion).toHaveBeenCalledWith('q9'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Question hidden'));
    await waitFor(() => expect(vi.mocked(api.fetchAdminReports).mock.calls.length).toBeGreaterThan(1));
  });

  it('AUCTION reports have no Hide question button', async () => {
    setup();
    await screen.findByRole('link', { name: /Brass Vase/ });
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Auction Brass Vase' }));
    await screen.findByRole('menuitem', { name: 'Dismiss' });
    expect(screen.queryByRole('menuitem', { name: 'Hide question' })).not.toBeInTheDocument();
  });

  it('mark action taken sends the note and apply-to-all', async () => {
    vi.mocked(api.resolveReport).mockResolvedValue({ resolvedCount: 3 });
    setup();
    await pick('Mark action taken');
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/Note/), 'Auction cancelled');
    await userEvent.click(within(dialog).getByLabelText(/Apply to all open reports/));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark action taken' }));
    await waitFor(() =>
      expect(api.resolveReport).toHaveBeenCalledWith({
        id: 'r1',
        status: 'ACTION_TAKEN',
        note: 'Auction cancelled',
        applyToAllOpenForTarget: true,
      }, expect.anything()),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('3 reports resolved'));
  });
});
