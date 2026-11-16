'use client';
import { useParams } from 'next/navigation';
import { SaleDetailPage } from '@/features/sales/components/sale-detail-page';

export default function PurchaseDetailRoute() {
  const { id } = useParams<{ id: string }>();
  return <SaleDetailPage id={id} view="buyer" />;
}
