import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ replace: vi.fn(), qs: '' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: m.replace }),
  usePathname: () => '/purchases',
  useSearchParams: () => new URLSearchParams(m.qs),
}));
vi.mock('@/features/strikes/components/strike-banner', () => ({ StrikeBanner: () => <div>strike notice</div> }));
vi.mock('@/features/second-chance/components/offers-section', () => ({
  usePendingOffers: () => ({ pending: [{ id: 'o1' }] }),
  OffersList: () => <div>offers list</div>,
}));
vi.mock('@/features/sales/components/sale-list', () => ({ SaleListBody: ({ status }: { status: string }) => <div>purchases {status}</div> }));

import PurchasesPage from './page';

beforeEach(() => {
  vi.clearAllMocks();
  m.qs = '';
});

describe('Purchases page', () => {
  it('shows header, strike notice, and all purchases by default', () => {
    render(<PurchasesPage />);
    expect(screen.getByRole('heading', { name: 'Purchases' })).toBeInTheDocument();
    expect(screen.getByText('strike notice')).toBeInTheDocument();
    expect(screen.getByText('purchases all')).toBeInTheDocument();
  });
  it('shows the Offers tab with a count and its list from the URL', () => {
    m.qs = 'tab=offers';
    render(<PurchasesPage />);
    expect(screen.getByRole('tab', { name: 'Offers (1)' })).toBeInTheDocument();
    expect(screen.getByText('offers list')).toBeInTheDocument();
  });
  it('validates the tab and writes changes to the URL', async () => {
    m.qs = 'tab=nope';
    render(<PurchasesPage />);
    expect(screen.getByText('purchases all')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Paid' }));
    expect(m.replace).toHaveBeenCalledWith('/purchases?tab=PAID', { scroll: false });
  });
});
