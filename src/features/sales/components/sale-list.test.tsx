import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ImgHTMLAttributes } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as salesApi from '../sales.api';
import type { SaleDTO } from '../sales.types';
import { SaleList, SaleListBody } from './sale-list';

const nav = vi.hoisted(() => ({ search: '', replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace }),
  usePathname: () => '/sell/sales',
  useSearchParams: () => new URLSearchParams(nav.search),
}));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => <img src={src as string} alt={alt} />,
}));
vi.mock('@/hooks/use-is-narrow-content', () => ({ useIsNarrowContent: () => false }));
vi.mock('../sales.api');

const sale = (status: string): SaleDTO =>
  ({
    id: 's1',
    status,
    amountPaise: 250000,
    createdAt: '2026-11-01T10:00:00.000Z',
    auction: { id: 'a1', title: 'Brass Vase', coverImage: null },
    buyer: { id: 'b', name: 'Bea' },
    seller: { id: 'u', name: 'Sam' },
  }) as SaleDTO;
const pageOf = (s: SaleDTO) => ({ items: [s], meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 } }) as never;

const setup = (role: 'buyer' | 'seller') =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SaleList role={role} />
    </QueryClientProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  nav.search = '';
  vi.mocked(salesApi.fetchMySales).mockResolvedValue(pageOf(sale('PAID')));
});

describe('SaleList', () => {
  it('seller: reads the status tab from the URL and offers Ship for a paid sale', async () => {
    nav.search = 'status=PAID';
    setup('seller');
    expect(screen.getByRole('tab', { name: 'Paid' })).toHaveAttribute('data-state', 'active');
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Brass Vase' }));
    expect(screen.getByRole('menuitem', { name: 'Ship' })).toHaveAttribute('href', '/sell/sales/s1');
    await waitFor(() => expect(vi.mocked(salesApi.fetchMySales).mock.calls[0]?.[1]).toBe('PAID'));
  });

  it('ignores an unknown status and writes a picked tab to the URL', async () => {
    nav.search = 'status=bogus';
    setup('seller');
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('data-state', 'active');
    await userEvent.click(screen.getByRole('tab', { name: 'Shipped' }));
    expect(nav.replace).toHaveBeenCalledWith('/sell/sales?status=SHIPPED', { scroll: false });
  });

  it('buyer: still links to /purchases and offers Pay now', async () => {
    vi.mocked(salesApi.fetchMySales).mockResolvedValue(pageOf(sale('AWAITING_PAYMENT')));
    setup('buyer');
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Brass Vase' }));
    expect(screen.getByRole('menuitem', { name: 'Pay now' })).toHaveAttribute('href', '/purchases/s1');
  });

  it('buyer: shows Pay now inline (solid) as well as in the menu', async () => {
    vi.mocked(salesApi.fetchMySales).mockResolvedValue(pageOf(sale('AWAITING_PAYMENT')));
    setup('buyer');
    expect(await screen.findByRole('link', { name: 'Pay now' })).toHaveAttribute('href', '/purchases/s1');
  });

  it('seller: shows Ship inline for a paid sale, and nothing inline otherwise', async () => {
    setup('seller');
    expect(await screen.findByRole('link', { name: 'Ship' })).toHaveAttribute('href', '/sell/sales/s1');
  });

  it('shows no inline next step for a shipped sale', async () => {
    vi.mocked(salesApi.fetchMySales).mockResolvedValue(pageOf(sale('SHIPPED')));
    setup('seller');
    await screen.findByRole('button', { name: 'Actions for Brass Vase' });
    expect(screen.queryByRole('link', { name: 'Ship' })).not.toBeInTheDocument();
  });

  it('SaleListBody: controlled status, no toolbar of its own', async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <SaleListBody role="buyer" status="SHIPPED" />
      </QueryClientProvider>,
    );
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Brass Vase' }));
    expect(screen.getByRole('menuitem', { name: 'View' })).toHaveAttribute('href', '/purchases/s1');
    await waitFor(() => expect(vi.mocked(salesApi.fetchMySales).mock.calls[0]?.[1]).toBe('SHIPPED'));
  });
});
