'use client';
import { ShoppingBag } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { apiErrorCode } from '@/lib/api-client';
import { saleErrorMessage } from '../sales.errors';
import type { SaleListRole } from '../sales.types';
import { useSale } from '../use-sales';
import { PurchaseActions } from './purchase-actions';
import { SaleDetailView } from './sale-detail';
import { SellerOfferCard } from '@/features/second-chance/components/seller-offer-card';
import { ShipForm } from './ship-form';

/** Loader + chrome for /purchases/[id] (`buyer`) and /sell/sales/[id] (`seller`). */
export function SaleDetailPage({ id, view }: { id: string; view: SaleListRole }) {
  const { data: sale, isPending, error, refetch } = useSale(id);
  const listHref = view === 'buyer' ? '/purchases' : '/sell/sales';
  const listLabel = view === 'buyer' ? 'Purchases' : 'Sales';

  return (
    <div className="space-y-4">
      <PageHeader title={view === 'buyer' ? 'Purchase' : 'Sale'} backHref={listHref} backLabel={`Back to ${listLabel.toLowerCase()}`} />

      {isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-40" />
        </div>
      ) : error || !sale ? (
        <EmptyState
          icon={ShoppingBag}
          title={apiErrorCode(error) === 'SALE_NOT_FOUND' ? 'Not found' : 'Could not load this page'}
          description={saleErrorMessage(error, 'Please try again.')}
          {...(apiErrorCode(error) === 'SALE_NOT_FOUND' ? { actionLabel: listLabel, actionHref: listHref } : { actionLabel: 'Try again', onAction: () => void refetch() })}
        />
      ) : (
        <SaleDetailView sale={sale}>
          {view === 'buyer' ? <PurchaseActions sale={sale} /> : (
            <>
              <ShipForm sale={sale} />
              <SellerOfferCard sale={sale} />
            </>
          )}
        </SaleDetailView>
      )}
    </div>
  );
}
