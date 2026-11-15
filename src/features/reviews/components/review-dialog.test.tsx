import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../reviews.api';
import { ReviewDialog } from './review-dialog';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('../reviews.api');

function setup() {
  const onOpenChange = vi.fn();
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <ReviewDialog auctionId="a1" sellerName="Sam" open onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  );
  return { onOpenChange };
}

beforeEach(() => vi.clearAllMocks());

describe('ReviewDialog', () => {
  it('requires a rating before submitting', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Submit rating' }));
    expect(await screen.findByText('Choose a rating')).toBeInTheDocument();
    expect(api.createReview).not.toHaveBeenCalled();
  });

  it('submits rating and comment, then closes', async () => {
    vi.mocked(api.createReview).mockResolvedValue({ id: 'r1' } as never);
    const { onOpenChange } = setup();
    await userEvent.click(screen.getByRole('radio', { name: '5 stars' }));
    await userEvent.type(screen.getByLabelText(/Comment/), 'Great seller');
    await userEvent.click(screen.getByRole('button', { name: 'Submit rating' }));
    await waitFor(() => expect(api.createReview).toHaveBeenCalledWith('a1', { rating: 5, comment: 'Great seller' }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(toast.success).toHaveBeenCalled();
  });

  it('omits an empty comment', async () => {
    vi.mocked(api.createReview).mockResolvedValue({ id: 'r1' } as never);
    setup();
    await userEvent.click(screen.getByRole('radio', { name: '3 stars' }));
    await userEvent.click(screen.getByRole('button', { name: 'Submit rating' }));
    await waitFor(() => expect(api.createReview).toHaveBeenCalledWith('a1', { rating: 3 }));
  });
});
