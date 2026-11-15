'use client';
import * as React from 'react';
import Link from 'next/link';
import { Check, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ContactCard } from '@/components/common/contact-card';
import { CoverImage } from '@/features/auctions/components/auction-card';
import { formatDate, formatINR } from '@/lib/utils';
import type { SaleDTO } from '../sales.types';
import { saleTimeline } from '../sales.utils';
import { SaleStatusBadge } from './sale-status-badge';

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? 'text-base font-semibold tnum' : 'tnum'}>{value}</dd>
    </div>
  );
}

export function SaleBreakdown({ sale }: { sale: SaleDTO }) {
  const seller = sale.role === 'SELLER' || sale.role === 'ADMIN';
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Amount</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-2">
          <Row label="Item" value={formatINR(sale.itemPaise)} />
          <Row label="Shipping" value={sale.shippingFeePaise > 0 ? formatINR(sale.shippingFeePaise) : 'Free'} />
          <div className="border-t pt-2">
            <Row label="Total" value={formatINR(sale.amountPaise)} strong />
          </div>
          {seller && typeof sale.commissionPaise === 'number' && (
            <Row label="Platform commission" value={`− ${formatINR(sale.commissionPaise)}`} />
          )}
          {seller && typeof sale.payoutPaise === 'number' && (
            <div className="border-t pt-2">
              <Row label="Your payout" value={formatINR(sale.payoutPaise)} strong />
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}

export function SaleTimeline({ sale }: { sale: SaleDTO }) {
  const steps = saleTimeline(sale);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {steps.map((s) => (
            <li key={s.key} className="flex items-start gap-3 text-sm" data-done={s.done}>
              {s.done ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <div className={s.done ? undefined : 'text-muted-foreground'}>
                <p className="font-medium">{s.label}</p>
                {s.at && <p className="text-xs text-muted-foreground">{formatDate(s.at)}</p>}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function ShippingInfo({ sale }: { sale: SaleDTO }) {
  if (!sale.shippingMethod) return null;
  return (
    <div className="space-y-1 rounded-lg border bg-background p-3 text-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Delivery</p>
      {sale.shippingMethod === 'PICKUP' ? (
        <p>Pickup arranged with the seller.</p>
      ) : (
        <p>
          Courier: <span className="font-medium">{sale.courier ?? '—'}</span>
        </p>
      )}
      {sale.trackingNo && (
        <p>
          Tracking no: <span className="font-medium">{sale.trackingNo}</span>
        </p>
      )}
    </div>
  );
}

/**
 * Shared body of /purchases/[id] and /sell/sales/[id]: the item, amount, progress and the
 * counterparty contact (the API only sends it once paid). Role-specific actions go in `children`.
 */
export function SaleDetailView({ sale, children }: { sale: SaleDTO; children?: React.ReactNode }) {
  const isBuyer = sale.role === 'BUYER';
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 @lg/content:flex-row @lg/content:items-center">
          <Link href={`/auctions/${sale.auction.id}`} className="flex min-w-0 flex-1 items-center gap-3 hover:underline">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
              <CoverImage src={sale.auction.coverImage} alt={sale.auction.title} sizes="80px" />
            </div>
            <div className="min-w-0">
              <p className="wrap-break-word text-lg font-semibold">{sale.auction.title}</p>
              <p className="text-sm text-muted-foreground">
                {isBuyer ? `Seller: ${sale.seller.name}` : `Buyer: ${sale.buyer.name}`}
              </p>
            </div>
          </Link>
          <SaleStatusBadge status={sale.status} />
        </CardContent>
      </Card>

      {children}

      <div className="grid gap-6 @3xl/content:grid-cols-2">
        <SaleBreakdown sale={sale} />
        <SaleTimeline sale={sale} />
      </div>

      {(sale.sellerContact || sale.buyerContact || sale.shippingMethod || sale.disputeReason) && (
        <div className="grid gap-4 @lg/content:grid-cols-2">
          {sale.sellerContact && <ContactCard title="Seller contact" contact={sale.sellerContact} />}
          {sale.buyerContact && <ContactCard title="Buyer contact" contact={sale.buyerContact} />}
          <ShippingInfo sale={sale} />
          {sale.disputeReason && (
            <div className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reported problem</p>
              <p className="whitespace-pre-line wrap-break-word">{sale.disputeReason}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
