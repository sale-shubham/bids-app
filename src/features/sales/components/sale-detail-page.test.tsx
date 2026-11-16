import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as salesApi from '../sales.api';
import { SaleDetailPage } from './sale-detail-page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }), usePathname: () => '/purchases/s1' }));
vi.mock('../sales.api');
vi.mock('./purchase-actions', () => ({ PurchaseActions: () => <div>buyer actions</div> }));
vi.mock('./sale-detail', () => ({ SaleDetailView: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('./ship-form', () => ({ ShipForm: () => <div>ship form</div> }));
vi.mock('@/features/second-chance/components/seller-offer-card', () => ({ SellerOfferCard: () => <div>offer card</div> }));

const setup = (view: 'buyer' | 'seller') =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SaleDetailPage id="s1" view={view} />
    </QueryClientProvider>,
  );

beforeEach(() => {
  vi.mocked(salesApi.fetchSale).mockResolvedValue({ id: 's1', status: 'PAID' } as never);
});

describe('SaleDetailPage', () => {
  it('buyer: Purchase header, back link to /purchases and buyer actions', async () => {
    setup('buyer');
    expect(screen.getByRole('heading', { name: 'Purchase' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to purchases/i })).toHaveAttribute('href', '/purchases');
    expect(await screen.findByText('buyer actions')).toBeInTheDocument();
  });
  it('seller: Sale header, ship form and offer card', async () => {
    setup('seller');
    expect(screen.getByRole('heading', { name: 'Sale' })).toBeInTheDocument();
    expect(await screen.findByText('ship form')).toBeInTheDocument();
    expect(screen.getByText('offer card')).toBeInTheDocument();
  });
});
