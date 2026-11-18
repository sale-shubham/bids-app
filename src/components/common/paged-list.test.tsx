import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Users } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { PagedList } from './paged-list';

type Props = React.ComponentProps<typeof PagedList<{ id: string }>>;
const base = (over: Record<string, unknown>, extra: Partial<Props> = {}) =>
  ({
    list: {
      desktop: { data: undefined, isLoading: false },
      mobile: { data: undefined, isLoading: false, hasNextPage: false, isFetchingNextPage: false, fetchNextPage: vi.fn() },
      mobileItems: [],
      error: undefined,
      refetch: vi.fn(),
      ...over,
    },
    page: 1,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    renderTable: () => <table />,
    renderCard: (i: { id: string }) => <div>{i.id}</div>,
    getKey: (i: { id: string }) => i.id,
    empty: { icon: Users, title: 'Nothing here', description: 'Try again later' },
    ...extra,
  }) as unknown as Props;

describe('PagedList', () => {
  it('shows the error state and retries', async () => {
    const refetch = vi.fn();
    render(<PagedList {...base({ error: new Error('x'), refetch })} />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('renders the empty-state action link and button', async () => {
    const { unmount } = render(
      <PagedList
        {...base({}, { empty: { icon: Users, title: 'Nothing here', description: 'd', actionLabel: 'Browse', actionHref: '/auctions' } })}
      />,
    );
    expect(screen.getAllByRole('link', { name: 'Browse' })[0]).toHaveAttribute('href', '/auctions');
    unmount();
    const onAction = vi.fn();
    render(<PagedList {...base({}, { empty: { icon: Users, title: 'Nothing here', description: 'd', actionLabel: 'Add', onAction } })} />);
    await userEvent.click(screen.getAllByRole('button', { name: 'Add' })[0]);
    expect(onAction).toHaveBeenCalled();
  });

  it('shows no action when the empty prop has none', () => {
    render(<PagedList {...base({})} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('uses errorTitle as the fallback message', () => {
    render(<PagedList {...base({ error: 'boom' }, { errorTitle: 'Could not load your bids' })} />);
    expect(screen.getByText('Could not load your bids')).toBeInTheDocument();
  });
});
