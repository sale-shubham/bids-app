import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore, type AuthMember } from '@/store/auth-store';
import { AuthGuard } from './auth-guard';

const replace = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }), usePathname: () => '/sell/new' }));

// setState bypasses setMember's normalisation, like a stale value that reached the store directly.
const signIn = (role: string | null) =>
  useAuthStore.setState({ member: role ? ({ id: 'u1', role } as unknown as AuthMember) : null, initialized: true });

const renderGuard = () =>
  render(
    <AuthGuard allow={['MEMBER']}>
      <p>member area</p>
    </AuthGuard>,
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AuthGuard', () => {
  it('lets a MEMBER in', () => {
    signIn('MEMBER');
    renderGuard();
    expect(screen.getByText('member area')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('treats the legacy BIDDER and AUCTIONEER values as MEMBER', () => {
    for (const legacy of ['BIDDER', 'AUCTIONEER']) {
      signIn(legacy);
      const { unmount } = renderGuard();
      expect(screen.getByText('member area')).toBeInTheDocument();
      unmount();
    }
    expect(replace).not.toHaveBeenCalled();
  });

  it('sends SUPER_ADMIN to /admin', async () => {
    signIn('SUPER_ADMIN');
    renderGuard();
    expect(screen.queryByText('member area')).not.toBeInTheDocument();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin'));
  });

  it('sends a guest to /login with ?next=', async () => {
    signIn(null);
    renderGuard();
    expect(screen.queryByText('member area')).not.toBeInTheDocument();
    await waitFor(() => expect(replace).toHaveBeenCalledWith(expect.stringMatching(/^\/login\?next=/)));
  });
});
