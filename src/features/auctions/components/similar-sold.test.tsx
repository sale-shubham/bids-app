import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuctionCard } from '../auctions.types';
import { SimilarSold } from './similar-sold';

const useSimilarSold = vi.fn();
vi.mock('../use-auctions', () => ({ useSimilarSold: (...a: unknown[]) => useSimilarSold(...a) }));
vi.mock('./auction-grid', () => ({
  AuctionGrid: ({ auctions }: { auctions: AuctionCard[] }) => (
    <ul>
      {auctions.map((a) => (
        <li key={a.id}>{a.title}</li>
      ))}
    </ul>
  ),
}));

beforeEach(() => useSimilarSold.mockReset());

describe('SimilarSold', () => {
  it('is hidden while loading and when empty', () => {
    useSimilarSold.mockReturnValue({ data: undefined });
    const { container, rerender } = render(<SimilarSold auctionId="a1" />);
    expect(container).toBeEmptyDOMElement();
    useSimilarSold.mockReturnValue({ data: [] });
    rerender(<SimilarSold auctionId="a1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the heading and the lots when there are some', () => {
    useSimilarSold.mockReturnValue({ data: [{ id: 'x', title: 'Brass Vase' }] });
    render(<SimilarSold auctionId="a1" />);
    expect(screen.getByRole('heading', { name: 'Recently sold in this category' })).toBeInTheDocument();
    expect(screen.getByText('Brass Vase')).toBeInTheDocument();
    expect(useSimilarSold).toHaveBeenCalledWith('a1');
  });
});
