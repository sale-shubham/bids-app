import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  replace: vi.fn(),
  qs: '',
  useMyBids: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: m.replace }),
  usePathname: () => '/my-bids',
  useSearchParams: () => new URLSearchParams(m.qs),
}));
vi.mock('@/features/bids/use-bids', () => ({ useMyBids: m.useMyBids }));
vi.mock('@/features/strikes/components/strike-banner', () => ({ StrikeBanner: () => <div>strike notice</div> }));

import MyBidsPage from './page';

const result = (over: object) => ({ isPending: false, isError: false, data: { pages: [{ items: [] }] }, hasNextPage: false, isFetchingNextPage: false, fetchNextPage: vi.fn(), refetch: vi.fn(), ...over });

beforeEach(() => {
  vi.clearAllMocks();
  m.qs = '';
  m.useMyBids.mockReturnValue(result({}));
});

describe('My bids page', () => {
  it('shows the header, strike notice and the Winning tab by default', () => {
    render(<MyBidsPage />);
    expect(screen.getByRole('heading', { name: 'My bids' })).toBeInTheDocument();
    expect(screen.getByText('strike notice')).toBeInTheDocument();
    expect(m.useMyBids).toHaveBeenCalledWith('winning');
    expect(screen.getByText('Not winning anything yet')).toBeInTheDocument();
  });

  it('reads the tab from the URL and ignores an invalid one', () => {
    m.qs = 'tab=won';
    const { unmount } = render(<MyBidsPage />);
    expect(m.useMyBids).toHaveBeenLastCalledWith('won');
    unmount();
    m.qs = 'tab=bogus';
    render(<MyBidsPage />);
    expect(m.useMyBids).toHaveBeenLastCalledWith('winning');
  });

  it('writes the tab to the URL', async () => {
    render(<MyBidsPage />);
    await userEvent.click(screen.getByRole('tab', { name: 'Outbid' }));
    expect(m.replace).toHaveBeenCalledWith('/my-bids?tab=outbid', { scroll: false });
  });

  it('shows the shared error state with Try again', async () => {
    const refetch = vi.fn();
    m.useMyBids.mockReturnValue(result({ isError: true, error: new Error('x'), refetch }));
    render(<MyBidsPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });
});
