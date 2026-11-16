import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../categories.api';
import type { AdminCategory } from '../categories.types';
import { AdminCategories } from './admin-categories';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('../categories.api');

vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });

const cat = (id: string, over: Partial<AdminCategory> = {}): AdminCategory => ({
  id,
  slug: id,
  name: id.toUpperCase(),
  description: null,
  parentId: null,
  sortOrder: 0,
  isActive: true,
  attributeSchema: [],
  auctionCount: 0,
  ...over,
});

function setup() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AdminCategories />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.fetchAdminCategories).mockResolvedValue([cat('a'), cat('b', { auctionCount: 2 })]);
  vi.mocked(api.deleteCategory).mockResolvedValue({});
});

describe('AdminCategories', () => {
  it('has a title-only header with the New category action', async () => {
    setup();
    expect(await screen.findByRole('heading', { name: 'Categories' })).toBeInTheDocument();
    expect(screen.queryByText(/category tree sellers list in/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New category/ })).toBeInTheDocument();
  });

  it('deletes only after confirming, from the row menu', async () => {
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for A' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    expect(api.deleteCategory).not.toHaveBeenCalled();
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(api.deleteCategory).toHaveBeenCalledWith('a'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Category deleted'));
  });

  it('explains why a category in use cannot be deleted', async () => {
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for B' }));
    expect(await screen.findByText('Has auctions: deactivate it instead')).toBeInTheDocument();
  });

  it('shows the empty state', async () => {
    vi.mocked(api.fetchAdminCategories).mockResolvedValue([]);
    setup();
    expect(await screen.findByText('No categories yet')).toBeInTheDocument();
  });

  it('shows Try again when loading fails', async () => {
    vi.mocked(api.fetchAdminCategories).mockRejectedValue(new Error('boom'));
    setup();
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
