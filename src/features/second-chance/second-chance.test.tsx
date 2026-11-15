import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SaleDTO } from '@/features/sales/sales.types';
import { parseSale } from '@/features/sales/sales.parse';
import { parseAcceptResponse, parseOffer, parseOfferList } from './second-chance.parse';
import type { OfferDTO } from './second-chance.types';

const m = vi.hoisted(() => ({
  create: vi.fn(),
  accept: vi.fn(),
  decline: vi.fn(),
  refetch: vi.fn(),
  push: vi.fn(),
  invalidate: vi.fn(),
  offer: undefined as unknown,
  offers: [] as unknown[],
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: m.push }) }));
vi.mock('./use-second-chance', () => ({
  useOfferSecondChance: () => ({ mutate: m.create, isPending: false }),
  useInvalidateOffers: () => m.invalidate,
  useOffer: () => ({ data: m.offer, isPending: false, error: null, refetch: m.refetch }),
  useMyOffers: () => ({ data: m.offers }),
  useAcceptOffer: () => ({ mutate: m.accept, isPending: false }),
  useDeclineOffer: () => ({ mutate: m.decline, isPending: false }),
}));

import { OfferDetailPage } from './components/offer-detail-page';
import { OffersSection } from './components/offers-section';
import { SellerOfferCard } from './components/seller-offer-card';

const inFuture = (ms: number) => new Date(Date.now() + ms).toISOString();
const offer = (over: Partial<OfferDTO> = {}): OfferDTO => ({
  id: 'o1',
  auctionId: 'a1',
  auction: { id: 'a1', title: 'Brass Vase', coverImage: null },
  amountPaise: 250000,
  status: 'PENDING',
  expiresAt: inFuture(30 * 3_600_000),
  respondedAt: null,
  newSaleId: null,
  createdAt: new Date().toISOString(),
  ...over,
});
const sale = (over: Partial<SaleDTO> = {}): SaleDTO =>
  ({ id: 's1', status: 'CANCELLED', role: 'SELLER', auction: { id: 'a1', title: 'Brass Vase', coverImage: null }, secondChanceOffer: null, canOfferSecondChance: true, ...over }) as SaleDTO;

beforeEach(() => {
  vi.clearAllMocks();
  m.offer = offer();
  m.offers = [];
});

describe('SellerOfferCard', () => {
  it('renders nothing when no offer can be made and none exists', () => {
    const { container } = render(<SellerOfferCard sale={sale({ canOfferSecondChance: false })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('Offer to the runner-up asks for confirmation (48 h, maximum bid) before sending', async () => {
    m.create.mockImplementation((_v: unknown, o: { onSuccess: () => void }) => o.onSuccess());
    render(<SellerOfferCard sale={sale()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Offer to the runner-up' }));
    expect(m.create).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent(/next-highest bidder at their maximum bid/);
    expect(dialog).toHaveTextContent(/48 hours/);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send offer' }));
    expect(m.create).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Offer sent to the runner-up');
  });

  it('NO_RUNNER_UP shows the mapped message', async () => {
    const { AxiosError } = await import('axios');
    const err = new AxiosError('x');
    err.response = { status: 409, data: { success: false, error: { code: 'NO_RUNNER_UP', message: 'm' } } } as never;
    m.create.mockImplementation((_v: unknown, o: { onError: (e: unknown) => void }) => o.onError(err));
    render(<SellerOfferCard sale={sale()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Offer to the runner-up' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Send offer' }));
    expect(toast.error).toHaveBeenCalledWith('There is no other bidder to offer this item to.');
  });

  it('shows the status of an existing offer instead of the button', () => {
    render(<SellerOfferCard sale={sale({ canOfferSecondChance: false, secondChanceOffer: offer({ status: 'DECLINED' }) })} />);
    expect(screen.getByText('Declined')).toBeInTheDocument();
    expect(screen.getByText('The runner-up declined the offer.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Offer to the runner-up' })).not.toBeInTheDocument();
  });
});

describe('OffersSection', () => {
  it('lists only PENDING offers and links to each', () => {
    m.offers = [offer(), offer({ id: 'o2', status: 'EXPIRED' })];
    render(<OffersSection />);
    expect(screen.getByRole('heading', { name: 'Offers' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'View offer' })).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'View offer' })).toHaveAttribute('href', '/purchases/offers/o1');
  });
  it('renders nothing without pending offers', () => {
    m.offers = [offer({ status: 'ACCEPTED' })];
    const { container } = render(<OffersSection />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('OfferDetailPage', () => {
  it('Accept confirms ("Pay within 3 days"), then navigates to the new sale', async () => {
    m.accept.mockImplementation((_v: unknown, o: { onSuccess: (d: unknown) => void }) => o.onSuccess({ saleId: 'new-sale' }));
    render(<OfferDetailPage id="o1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Accept offer' }));
    expect(m.accept).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('You agree to buy this for ₹2,500. Pay within 3 days.');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Buy for ₹2,500' }));
    expect(m.accept).toHaveBeenCalled();
    expect(m.push).toHaveBeenCalledWith('/purchases/new-sale');
  });

  it('Accept failing with PAYOUT_ACCOUNT_INACTIVE toasts the mapped copy and stays', async () => {
    const { AxiosError } = await import('axios');
    const err = new AxiosError('x');
    err.response = { status: 409, data: { success: false, error: { code: 'PAYOUT_ACCOUNT_INACTIVE', message: 'm' } } } as never;
    m.accept.mockImplementation((_v: unknown, o: { onError: (e: unknown) => void }) => o.onError(err));
    render(<OfferDetailPage id="o1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Accept offer' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Buy for ₹2,500' }));
    expect(toast.error).toHaveBeenCalledWith('The seller cannot receive payments right now. Please try again later.');
    expect(m.push).not.toHaveBeenCalled();
  });

  it('Decline confirms first, then declines', async () => {
    m.decline.mockImplementation((_v: unknown, o: { onSuccess: () => void }) => o.onSuccess());
    render(<OfferDetailPage id="o1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Decline' }));
    expect(m.decline).not.toHaveBeenCalled();
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Decline' }));
    expect(m.decline).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Offer declined');
  });

  it('an EXPIRED offer shows the expired state and no actions', () => {
    m.offer = offer({ status: 'EXPIRED', expiresAt: new Date(Date.now() - 1000).toISOString() });
    render(<OfferDetailPage id="o1" />);
    expect(screen.getByText('This offer has expired.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept offer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument();
  });

  it('a PENDING offer whose time ran out locally also loses its actions', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      m.offer = offer({ expiresAt: new Date(Date.now() + 2000).toISOString() });
      render(<OfferDetailPage id="o1" />);
      expect(screen.getByRole('button', { name: 'Accept offer' })).toBeInTheDocument();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(4000);
      });
      await waitFor(() => expect(screen.queryByRole('button', { name: 'Accept offer' })).not.toBeInTheDocument());
    } finally {
      vi.useRealTimers();
    }
  });

  it('an ACCEPTED offer links to the new purchase', () => {
    m.offer = offer({ status: 'ACCEPTED', newSaleId: 's9' });
    render(<OfferDetailPage id="o1" />);
    expect(screen.getByRole('link', { name: 'View purchase' })).toHaveAttribute('href', '/purchases/s9');
  });
});

describe('second-chance parsing', () => {
  it('parseOffer defaults unknown status to PENDING and fills missing fields', () => {
    expect(parseOffer({ id: 'o', status: 'weird', auction: { id: 'a' } })).toMatchObject({ id: 'o', status: 'PENDING', auction: { id: 'a', title: 'Auction', coverImage: null }, newSaleId: null });
  });
  it('parseOfferList reads items; parseAcceptResponse accepts saleId or sale.id', () => {
    expect(parseOfferList({ data: { items: [{ id: 'o1' }, { id: 'o2' }] } })).toHaveLength(2);
    expect(parseAcceptResponse({ data: { offer: { id: 'o' }, saleId: 's1' } }).saleId).toBe('s1');
    expect(parseAcceptResponse({ data: { offer: { id: 'o' }, sale: { id: 's2' } } }).saleId).toBe('s2');
    expect(parseAcceptResponse({ data: { offer: { id: 'o', newSaleId: 's3' } } }).saleId).toBe('s3');
  });
  it('SaleDTO seller fields: offer + canOfferSecondChance are mapped, and omitted for other roles', () => {
    const s = parseSale({ id: 's', role: 'SELLER', status: 'CANCELLED', canOfferSecondChance: false, secondChanceOffer: { id: 'o', status: 'ACCEPTED', amountPaise: 5 } });
    expect(s.canOfferSecondChance).toBe(false);
    expect(s.secondChanceOffer).toMatchObject({ id: 'o', status: 'ACCEPTED', amountPaise: 5 });
    expect(parseSale({ id: 's', role: 'SELLER', secondChanceOffer: null }).secondChanceOffer).toBeNull();
    const buyer = parseSale({ id: 's', role: 'BUYER' });
    expect('secondChanceOffer' in buyer).toBe(false);
    expect('canOfferSecondChance' in buyer).toBe(false);
  });
});
