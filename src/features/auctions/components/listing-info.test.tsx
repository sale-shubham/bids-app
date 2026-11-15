import { render, screen } from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { AuctionCard as AuctionCardData } from '../auctions.types';
import { AuctionCard } from './auction-card';
import { CategoryBreadcrumb, ConditionReport, DeliveryBlock, EstimateLine, SpecsTable, estimateText } from './listing-info';

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => <img src={src as string} alt={alt} />,
}));
vi.mock('@/features/watchlist/components/watch-button', () => ({ WatchButton: () => null }));

describe('detail listing blocks', () => {
  it('breadcrumb links each step to the browse page by slug', () => {
    render(
      <CategoryBreadcrumb
        path={[
          { id: '1', slug: 'jewellery', name: 'Jewellery' },
          { id: '2', slug: 'rings', name: 'Rings' },
        ]}
      />,
    );
    expect(screen.getByRole('link', { name: 'Jewellery' })).toHaveAttribute('href', '/auctions?category=jewellery');
    expect(screen.getByRole('link', { name: 'Rings' })).toHaveAttribute('href', '/auctions?category=rings');
  });
  it('specifications table shows label, value and unit', () => {
    render(
      <SpecsTable
        specs={[
          { key: 'w', label: 'Weight', value: 12.5, unit: 'g' },
          { key: 'm', label: 'Metal', value: 'Gold' },
        ]}
      />,
    );
    expect(screen.getByText('Specifications')).toBeInTheDocument();
    expect(screen.getByText('12.5 g')).toBeInTheDocument();
    expect(screen.getByText('Gold')).toBeInTheDocument();
  });
  it('estimate line needs both bounds', () => {
    const { container, rerender } = render(<EstimateLine low={100000} high={250000} />);
    expect(container).toHaveTextContent('Estimate ₹1,000 – ₹2,500');
    rerender(<EstimateLine low={100000} high={null} />);
    expect(container).toBeEmptyDOMElement();
    expect(estimateText(1, undefined)).toBeNull();
  });
  it('condition report is a collapsible section that renders sanitised rich text', () => {
    render(<ConditionReport html="<p>Minor scratches</p><script>alert(1)</script>" />);
    expect(screen.getByText('Condition report')).toBeInTheDocument();
    expect(screen.getByTestId('condition-report').tagName).toBe('DETAILS');
    expect(screen.getByText('Minor scratches')).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
  it('delivery block: pickup city, courier fee, ships within', () => {
    render(<DeliveryBlock options={{ pickup: true, pickupCity: 'Pune', courier: true, shippingFeePaise: 15000, shipsWithinDays: 3 }} />);
    expect(screen.getByText('Pune')).toBeInTheDocument();
    expect(screen.getByText('₹150')).toBeInTheDocument();
    expect(screen.getByText(/ships within 3 days/)).toBeInTheDocument();
  });
  it('delivery block: free courier, no pickup', () => {
    render(<DeliveryBlock options={{ pickup: false, courier: true, shippingFeePaise: 0 }} />);
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.queryByText(/Pickup/)).not.toBeInTheDocument();
  });
});

describe('AuctionCard estimate', () => {
  const card = (over: Partial<AuctionCardData> = {}): AuctionCardData => ({
    id: 'a1',
    title: 'Ring',
    category: 'Rings',
    condition: 'LIKE_NEW',
    coverImage: null,
    startingBidPaise: 100000,
    currentBidPaise: 0,
    bidCount: 0,
    startTime: new Date(Date.now() - 3_600_000).toISOString(),
    endTime: new Date(Date.now() + 3_600_000).toISOString(),
    status: 'LIVE',
    seller: { id: 's', name: 'Sam', avatarUrl: null },
    buyNowPricePaise: null,
    hasReserve: false,
    reserveMet: false,
    ...over,
  });
  it('shows a compact estimate line only when both bounds exist', () => {
    const { rerender } = render(<AuctionCard auction={card({ estimateLowPaise: 100000, estimateHighPaise: 200000 })} />);
    expect(screen.getByText('Est. ₹1,000–₹2,000')).toBeInTheDocument();
    rerender(<AuctionCard auction={card()} />);
    expect(screen.queryByText(/Est\./)).not.toBeInTheDocument();
  });
});
