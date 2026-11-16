import { UnpaidCommissionBanner } from '@/features/commissions/components/unpaid-commission-banner';

// Selling pages (/sell/*): the unpaid-commission banner shows only here, as one slim notice above the
// page header (it hides itself on /sell/commissions and the auction form pages). The member shell comes from (member)/layout.tsx.
export default function SellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <UnpaidCommissionBanner />
      {children}
    </div>
  );
}
