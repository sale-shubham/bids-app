import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/reviews/reviews.api';
import type { AdminReview } from '@/features/reviews/reviews.types';
import AdminReviewsPage from './page';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/features/reviews/reviews.api');
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/admin/reviews',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/hooks/use-is-narrow-content', () => ({ useIsNarrowContent: () => false }));

const review: AdminReview = {
  id: 'r1',
  auctionId: 'a1',
  auctionTitle: 'Brass Vase',
  rating: 1,
  comment: 'Rude buyer',
  sellerReply: null,
  sellerRepliedAt: null,
  createdAt: '2026-11-01T00:00:00Z',
  reviewerLabel: 'R***h',
  hiddenAt: null,
  reviewer: { id: 'u1', name: 'Ravi', email: 'ravi@example.com' },
  seller: { id: 's1', name: 'Sam Seller' },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.fetchAdminReviews).mockResolvedValue({ items: [review], meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 } });
});

describe('AdminReviewsPage', () => {
  it('hides a review only after confirming', async () => {
    vi.mocked(api.setReviewHidden).mockResolvedValue({ ...review, hiddenAt: '2026-11-02T00:00:00Z' });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <AdminReviewsPage />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('Rude buyer')).toBeInTheDocument();
    expect(api.fetchAdminReviews).toHaveBeenCalledWith({ visibility: 'visible', q: '' }, 1, 10);
    expect(screen.getByRole('heading', { name: 'Reviews' })).toBeInTheDocument();
    expect(screen.queryByText(/Seller ratings left by/)).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Filters' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Actions for review by Ravi' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Hide' }));
    expect(api.setReviewHidden).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Hide review' }));
    await waitFor(() => expect(api.setReviewHidden).toHaveBeenCalledWith('r1', true));
  });
});
