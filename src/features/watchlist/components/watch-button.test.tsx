import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore, type AuthMember } from '@/store/auth-store';
import { WatchButton } from './watch-button';

const push = vi.fn();
const mutate = vi.fn();
let watching = false;
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('../use-watchlist', () => ({
  useIsWatching: () => watching,
  useToggleWatch: () => ({ mutate }),
}));

beforeEach(() => {
  watching = false;
  useAuthStore.setState({ member: null, initialized: true });
  window.history.pushState({}, '', '/auctions?status=live');
});

describe('WatchButton', () => {
  it('sends guests to login with the current page as next', async () => {
    render(<WatchButton auctionId="a1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Add to watchlist' }));
    expect(push).toHaveBeenCalledWith(`/login?next=${encodeURIComponent('/auctions?status=live')}`);
    expect(mutate).not.toHaveBeenCalled();
  });

  it('does nothing for a guest before auth has initialized', async () => {
    useAuthStore.setState({ member: null, initialized: false });
    render(<WatchButton auctionId="a1" />);
    await userEvent.click(screen.getByRole('button'));
    expect(push).not.toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('toggles for signed-in members', async () => {
    useAuthStore.setState({ member: { id: 'u' } as AuthMember, initialized: true });
    render(<WatchButton auctionId="a1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Add to watchlist' }));
    expect(mutate).toHaveBeenCalledWith({ auctionId: 'a1', watching: true });
    expect(push).not.toHaveBeenCalled();
  });

  it('reflects the watching state (label + aria-pressed) and un-watches', async () => {
    watching = true;
    useAuthStore.setState({ member: { id: 'u' } as AuthMember, initialized: true });
    render(<WatchButton auctionId="a1" variant="inline" />);
    const btn = screen.getByRole('button', { name: /Watching/ });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(btn);
    expect(mutate).toHaveBeenCalledWith({ auctionId: 'a1', watching: false });
  });

  it('does not trigger a parent link click', async () => {
    const onParent = vi.fn();
    render(
      <a href="/x" onClick={onParent}>
        <WatchButton auctionId="a1" />
      </a>,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onParent).not.toHaveBeenCalled();
  });
});
