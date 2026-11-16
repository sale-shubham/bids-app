import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as followsApi from '../follows.api';
import { useAuthStore, type AuthMember } from '@/store/auth-store';
import { FollowButton } from './follow-button';
import { FollowingCard } from './following-card';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('../follows.api');

const signIn = (over: Partial<AuthMember> = {}) =>
  useAuthStore.setState({ member: { id: 'me', role: 'MEMBER', ...over } as AuthMember, initialized: true });

function wrap(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const seller = (id: string, name: string) => ({
  id,
  name,
  avatarUrl: null,
  verified: false,
  ratingAvg: null,
  ratingCount: 0,
  activeAuctions: 2,
  followedAt: '2026-11-01T00:00:00Z',
});

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ member: null, initialized: true });
});

describe('FollowButton', () => {
  it('sends guests to login', async () => {
    wrap(<FollowButton sellerId="s1" initialFollowerCount={3} />);
    await userEvent.click(screen.getByRole('button', { name: /Follow/ }));
    expect(push).toHaveBeenCalledWith(expect.stringMatching(/^\/login\?next=/));
    expect(followsApi.followSeller).not.toHaveBeenCalled();
  });

  it('toggles optimistically and keeps the server state', async () => {
    signIn();
    vi.mocked(followsApi.fetchFollowState).mockResolvedValue({ following: false, followerCount: 3 });
    let release: (v: { following: boolean; followerCount: number }) => void = () => {};
    vi.mocked(followsApi.followSeller).mockReturnValue(new Promise((r) => (release = r)));
    wrap(<FollowButton sellerId="s1" initialFollowerCount={3} showCount />);
    const btn = await screen.findByRole('button', { name: 'Follow' });
    await waitFor(() => expect(btn).toBeEnabled());
    await userEvent.click(btn);
    expect(await screen.findByRole('button', { name: 'Following' })).toBeInTheDocument();
    expect(screen.getByText('4 followers')).toBeInTheDocument();
    release({ following: true, followerCount: 4 });
    await waitFor(() => expect(screen.getByText('4 followers')).toBeInTheDocument());
  });

  it('rolls back and toasts when the call fails', async () => {
    signIn();
    vi.mocked(followsApi.fetchFollowState).mockResolvedValue({ following: false, followerCount: 3 });
    vi.mocked(followsApi.followSeller).mockRejectedValue(new Error('boom'));
    wrap(<FollowButton sellerId="s1" initialFollowerCount={3} showCount />);
    const btn = await screen.findByRole('button', { name: 'Follow' });
    await waitFor(() => expect(btn).toBeEnabled());
    await userEvent.click(btn);
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(await screen.findByRole('button', { name: 'Follow' })).toBeInTheDocument();
    expect(screen.getByText('3 followers')).toBeInTheDocument();
  });

  it('is hidden on your own profile and for members who have not listed anything', () => {
    signIn({ id: 's1' });
    const { unmount } = wrap(<FollowButton sellerId="s1" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    unmount();
    signIn();
    wrap(<FollowButton sellerId="s2" listedCount={0} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows for a seller who has listed auctions', () => {
    signIn();
    wrap(<FollowButton sellerId="s2" listedCount={3} />);
    expect(screen.getByRole('button', { name: 'Follow' })).toBeInTheDocument();
  });

  it('is hidden for an admin viewer', () => {
    signIn({ role: 'SUPER_ADMIN' });
    wrap(<FollowButton sellerId="s2" listedCount={3} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('FollowingCard', () => {
  it('lists followed sellers and unfollows one', async () => {
    signIn();
    const meta = { total: 2, page: 1, pageSize: 20, totalPages: 1 };
    vi.mocked(followsApi.fetchFollowing)
      .mockResolvedValueOnce({ items: [seller('s1', 'Alpha Antiques'), seller('s2', 'Beta Books')], meta })
      .mockResolvedValue({ items: [seller('s2', 'Beta Books')], meta });
    vi.mocked(followsApi.unfollowSeller).mockResolvedValue({ following: false, followerCount: 0 });
    wrap(<FollowingCard />);
    expect(await screen.findByText('Alpha Antiques')).toBeInTheDocument();
    expect(screen.getByText('Beta Books')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Unfollow Alpha Antiques' }));
    await waitFor(() => expect(followsApi.unfollowSeller).toHaveBeenCalledWith('s1'));
    await waitFor(() => expect(screen.queryByText('Alpha Antiques')).not.toBeInTheDocument());
  });

  it('shows an empty state', async () => {
    signIn();
    vi.mocked(followsApi.fetchFollowing).mockResolvedValue({ items: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 1 } });
    wrap(<FollowingCard />);
    expect(await screen.findByText('Not following anyone yet')).toBeInTheDocument();
  });
});
