import * as React from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, MapPin, Truck } from 'lucide-react';
import { RichText } from '@/components/common/rich-text';
import type { CategoryPathItem } from '@/features/categories/categories.types';
import { formatINR } from '@/lib/utils';
import type { AuctionSpec, ShippingOptions } from '../auctions.types';

/** "₹X – ₹Y" when both estimate bounds exist, else null. */
export function estimateText(low?: number | null, high?: number | null, sep = ' – '): string | null {
  return typeof low === 'number' && typeof high === 'number' ? `${formatINR(low)}${sep}${formatINR(high)}` : null;
}

/** Breadcrumb from the category path; each step links to the browse page filtered by that category slug. */
export function CategoryBreadcrumb({ path }: { path: CategoryPathItem[] }) {
  if (path.length === 0) return null;
  return (
    <nav aria-label="Category" className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      {path.map((c, i) => (
        <React.Fragment key={c.id}>
          {i > 0 && <ChevronRight className="h-3 w-3" aria-hidden />}
          <Link href={`/auctions?category=${encodeURIComponent(c.slug)}`} className="hover:text-foreground hover:underline">
            {c.name}
          </Link>
        </React.Fragment>
      ))}
    </nav>
  );
}

export function EstimateLine({ low, high }: { low?: number | null; high?: number | null }) {
  const text = estimateText(low, high);
  if (!text) return null;
  return (
    <p className="text-sm text-muted-foreground">
      Estimate <span className="font-medium text-foreground tnum">{text}</span>
    </p>
  );
}

export function SpecsTable({ specs }: { specs: AuctionSpec[] }) {
  if (specs.length === 0) return null;
  return (
    <section className="space-y-3" aria-labelledby="specifications">
      <h2 id="specifications" className="text-lg font-semibold">
        Specifications
      </h2>
      <dl className="divide-y rounded-xl border text-sm">
        {specs.map((s) => (
          <div key={s.key} className="grid grid-cols-2 gap-4 px-4 py-2.5">
            <dt className="text-muted-foreground">{s.label}</dt>
            <dd className="font-medium">
              {s.value}
              {s.unit ? ` ${s.unit}` : ''}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Collapsible condition report (native details/summary, closed by default). */
export function ConditionReport({ html }: { html: string }) {
  return (
    <details className="group rounded-xl border" data-testid="condition-report">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-lg font-semibold [&::-webkit-details-marker]:hidden">
        Condition report
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="border-t px-4 py-3">
        <RichText html={html} />
      </div>
    </details>
  );
}

export function DeliveryBlock({ options }: { options: ShippingOptions }) {
  if (!options.pickup && !options.courier) return null;
  const fee = options.shippingFeePaise ?? 0;
  return (
    <div className="space-y-2 rounded-xl border p-3 text-sm" aria-label="Delivery">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Delivery</p>
      {options.pickup && (
        <p className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden />
          <span>
            Pickup{options.pickupCity ? <> in <span className="font-medium">{options.pickupCity}</span></> : null}
          </span>
        </p>
      )}
      {options.courier && (
        <p className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-muted-foreground" aria-hidden />
          <span>
            Courier: <span className="font-medium">{fee > 0 ? formatINR(fee) : 'Free'}</span>
            {typeof options.shipsWithinDays === 'number' && options.shipsWithinDays > 0 && (
              <span className="text-muted-foreground"> · ships within {options.shipsWithinDays} {options.shipsWithinDays === 1 ? 'day' : 'days'}</span>
            )}
          </span>
        </p>
      )}
    </div>
  );
}
