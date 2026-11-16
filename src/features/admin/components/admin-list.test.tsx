import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Users } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { AdminList } from './admin-list';

type Props = React.ComponentProps<typeof AdminList<{ id: string }>>;
const base = (over: Record<string, unknown>) =>
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
  }) as unknown as Props;

describe('AdminList', () => {
  it('shows the empty state', () => {
    render(<AdminList {...base({})} />);
    expect(screen.getAllByText('Nothing here').length).toBeGreaterThan(0);
  });

  it('shows the error state and retries', async () => {
    const refetch = vi.fn();
    render(<AdminList {...base({ error: new Error('x'), refetch })} />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });
});
