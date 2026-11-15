import { parsePaged, type Paged } from '@/lib/paged';
import { parseCommissionPage } from '@/features/commissions/commissions.parse';
import type { AuctionCard } from '@/features/auctions/auctions.types';
import { resolveCheckoutMode } from '@/features/settings/settings.types';
import { DEFAULT_MAX_PRICE_PAISE } from '@/features/settings/settings.utils';
import type { Role } from '@/constants/routes';
import type {
  AdminAuction,
  AdminCommission,
  AdminDashboard,
  AdminMember,
  AdminPayment,
  AdminSettings,
  LegalPage,
  LegalSlug,
  PaymentStatus,
} from './admin.types';

// The ONLY place that maps admin API response shapes (envelope `{ success, data }`).
// If the backend renames a key, change it here.

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (typeof v === 'object' && v !== null ? (v as Obj) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);
const strOrNull = (v: unknown) => (typeof v === 'string' && v ? v : null);
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const data = (body: unknown) => obj(obj(body).data);

export function parseDashboard(body: unknown): AdminDashboard {
  const d = data(body);
  const t = obj(d.totals);
  return {
    totals: {
      members: num(t.members),
      bidders: num(t.bidders),
      auctioneers: num(t.auctioneers),
      liveAuctions: num(t.liveAuctions),
      upcomingAuctions: num(t.upcomingAuctions),
      endedAuctions: num(t.endedAuctions),
      bidsToday: num(t.bidsToday),
      commissionPaidPaise: num(t.commissionPaidPaise),
      commissionDuePaise: num(t.commissionDuePaise),
    },
    revenueByMonth: arr(d.revenueByMonth).map((r) => ({ month: str(obj(r).month), paidPaise: num(obj(r).paidPaise) })),
    signupsByMonth: arr(d.signupsByMonth).map((r) => ({
      month: str(obj(r).month),
      bidders: num(obj(r).bidders),
      auctioneers: num(obj(r).auctioneers),
    })),
    recentAuctions: arr(d.recentAuctions) as AuctionCard[],
  };
}

function parseMember(raw: unknown): AdminMember {
  const m = obj(raw);
  const role: Role = m.role === 'AUCTIONEER' || m.role === 'SUPER_ADMIN' ? m.role : 'BIDDER';
  return {
    id: str(m.id),
    name: str(m.name),
    email: str(m.email),
    phone: strOrNull(m.phone),
    role,
    isActive: m.isActive !== false,
    emailVerifiedAt: strOrNull(m.emailVerifiedAt),
    createdAt: str(m.createdAt),
    unpaidCommissionPaise: num(m.unpaidCommissionPaise),
    auctionsWon: num(m.auctionsWon),
    moneySpentPaise: num(m.moneySpentPaise),
  };
}

export function parseMemberPage(body: unknown): Paged<AdminMember> {
  const p = parsePaged<unknown>(body);
  return { items: p.items.map(parseMember), meta: p.meta };
}

export function parseAuctionAdminPage(body: unknown): Paged<AdminAuction> {
  const p = parsePaged<unknown>(body);
  return {
    items: p.items.map((a) => ({ ...(a as AuctionCard), sellerEmail: str(obj(a).sellerEmail) })),
    meta: p.meta,
  };
}

export function parseCommissionAdminPage(body: unknown): Paged<AdminCommission> {
  const base = parseCommissionPage(body);
  const raw = parsePaged<unknown>(body).items;
  return {
    meta: base.meta,
    items: base.items.map((c, i) => {
      const s = obj(obj(raw[i]).seller);
      return { ...c, seller: { id: str(s.id), name: str(s.name), email: str(s.email) } };
    }),
  };
}

function parsePayment(raw: unknown): AdminPayment {
  const p = obj(raw);
  const m = obj(p.member);
  // API sends CREATED | PAID | FAILED (uppercase); the UI uses lowercase.
  const rawStatus = str(p.status).toLowerCase();
  const status: PaymentStatus = rawStatus === 'paid' || rawStatus === 'failed' ? rawStatus : 'created';
  return {
    id: str(p.id),
    member: { id: str(m.id), name: str(m.name), email: str(m.email) },
    amountPaise: num(p.amountPaise),
    status,
    gatewayOrderId: strOrNull(p.gatewayOrderId),
    gatewayPaymentId: strOrNull(p.gatewayPaymentId),
    referenceType: strOrNull(p.referenceType),
    referenceId: strOrNull(p.referenceId),
    createdAt: str(p.createdAt),
  };
}

export function parsePaymentPage(body: unknown): Paged<AdminPayment> {
  const p = parsePaged<unknown>(body);
  return { items: p.items.map(parsePayment), meta: p.meta };
}

export function parseSettings(body: unknown): AdminSettings {
  const d = data(body);
  return {
    commissionRateBps: num(d.commissionRateBps, 500),
    minIncrementPaise: num(d.minIncrementPaise, 10000),
    antiSnipingMinutes: num(d.antiSnipingMinutes, 2),
    categories: arr(d.categories).filter((c): c is string => typeof c === 'string'),
    maxPricePaise: num(d.maxPricePaise, DEFAULT_MAX_PRICE_PAISE),
    checkoutMode: resolveCheckoutMode(d.checkoutMode),
  };
}

export function parseLegal(body: unknown, slug: LegalSlug): LegalPage {
  const d = data(body);
  return { slug, title: str(d.title), content: str(d.content), updatedAt: strOrNull(d.updatedAt) };
}
