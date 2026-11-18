import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore, type AuthMember } from '@/store/auth-store';
import type { StrikeDTO } from '../strikes.types';

const m = vi.hoisted(() => ({ remove: vi.fn(), refetch: vi.fn(), strikes: [] as StrikeDTO[], path: '/my-bids' }));
vi.mock('next/navigation', () => ({ usePathname: () => m.path }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('../use-strikes', () => ({
  useMemberStrikes: () => ({ data: m.strikes, isPending: false, error: null, refetch: m.refetch }),
  useRemoveStrike: () => ({ mutate: m.remove, isPending: false }),
}));

import { MemberStrikesDialog } from './member-strikes-dialog';
import { StrikeBanner } from './strike-banner';

const signIn = (strikes?: number) => useAuthStore.setState({ member: { id: 'me', role: 'MEMBER', activeStrikes: strikes } as AuthMember, initialized: true });

describe('StrikeBanner', () => {
  beforeEach(() => {
    m.path = '/my-bids';
  });
  it('shows on the buying pages and their sub-paths but not on selling pages', () => {
    signIn(1);
    for (const path of ['/my-bids', '/purchases', '/purchases/s1', '/watchlist']) {
      m.path = path;
      const { unmount } = render(<StrikeBanner />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
      unmount();
    }
    for (const path of ['/sell/auctions', '/profile', '/notifications']) {
      m.path = path;
      const { container, unmount } = render(<StrikeBanner />);
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
  });
  it('renders nothing without strikes', () => {
    signIn(0);
    const { container } = render(<StrikeBanner />);
    expect(container).toBeEmptyDOMElement();
  });
  it('renders nothing when the field is absent', () => {
    signIn(undefined);
    const { container } = render(<StrikeBanner />);
    expect(container).toBeEmptyDOMElement();
  });
  it('warns with the count (singular and plural) and the policy', () => {
    signIn(1);
    const { unmount } = render(<StrikeBanner />);
    expect(screen.getByRole('alert')).toHaveTextContent('You have 1 strike for unpaid purchases. With 2, every bid needs a deposit; with 3 your account is suspended. Strikes expire after 12 months.');
    unmount();
    signIn(2);
    render(<StrikeBanner />);
    expect(screen.getByRole('alert')).toHaveTextContent('You have 2 strikes');
  });
});

const strike = (over: Partial<StrikeDTO>): StrikeDTO => ({
  id: 'k1',
  saleId: 's1',
  auction: { id: 'a1', title: 'Brass Vase' },
  reason: 'UNPAID',
  createdAt: '2026-10-01T00:00:00Z',
  expiresAt: '2027-10-01T00:00:00Z',
  removedAt: null,
  note: null,
  active: true,
  ...over,
});

describe('MemberStrikesDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.strikes = [strike({}), strike({ id: 'k2', removedAt: '2026-11-01T00:00:00Z', active: false, note: 'Seller error' })];
  });

  it('lists strikes; only active ones have Remove', async () => {
    render(<MemberStrikesDialog member={{ id: 'm1', name: 'Bea', email: 'bea@example.com' }} onClose={vi.fn()} />);
    expect(await screen.findByText('Active')).toBeInTheDocument();
    expect(screen.getByText(/Removed/)).toBeInTheDocument();
    expect(screen.getByText('Note: Seller error')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Remove' })).toHaveLength(1);
  });

  it('removes only after confirming, sending the optional note', async () => {
    m.remove.mockImplementation((_v: unknown, o: { onSuccess: () => void }) => o.onSuccess());
    render(<MemberStrikesDialog member={{ id: 'm1', name: 'Bea', email: 'bea@example.com' }} onClose={vi.fn()} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Remove' }));
    expect(m.remove).not.toHaveBeenCalled();
    const confirm = (await screen.findAllByRole('dialog')).at(-1)!;
    await userEvent.type(within(confirm).getByLabelText('Note (optional)'), 'Paid offline');
    await userEvent.click(within(confirm).getByRole('button', { name: 'Remove strike' }));
    await waitFor(() => expect(m.remove).toHaveBeenCalledWith({ id: 'k1', note: 'Paid offline' }, expect.any(Object)));
    expect(toast.success).toHaveBeenCalledWith('Strike removed');
  });

  it('shows the mapped error and refetches when the strike was already removed', async () => {
    const { AxiosError } = await import('axios');
    const err = new AxiosError('x');
    err.response = { status: 409, data: { success: false, error: { code: 'STRIKE_ALREADY_REMOVED', message: 'm' } } } as never;
    m.remove.mockImplementation((_v: unknown, o: { onError: (e: unknown) => void }) => o.onError(err));
    render(<MemberStrikesDialog member={{ id: 'm1', name: 'Bea', email: 'bea@example.com' }} onClose={vi.fn()} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Remove' }));
    const confirm = (await screen.findAllByRole('dialog')).at(-1)!;
    await userEvent.click(within(confirm).getByRole('button', { name: 'Remove strike' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('This strike was already removed.'));
    expect(m.refetch).toHaveBeenCalled();
  });
});
