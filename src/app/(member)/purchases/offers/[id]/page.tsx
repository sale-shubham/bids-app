'use client';
import { useParams } from 'next/navigation';
import { OfferDetailPage } from '@/features/second-chance/components/offer-detail-page';

export default function OfferPage() {
  const { id } = useParams<{ id: string }>();
  return <OfferDetailPage id={id} />;
}
