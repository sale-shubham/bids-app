import { Suspense } from 'react';
import { SellerAnalyticsPage } from '@/features/analytics/components/seller-analytics-page';

// Seller analytics (MEMBER; the /sell prefix is gated in constants/routes.ts). The day range lives in the URL (`?days=`), so it needs Suspense.
export default function SellAnalyticsPage() {
  return (
    <Suspense>
      <SellerAnalyticsPage />
    </Suspense>
  );
}
