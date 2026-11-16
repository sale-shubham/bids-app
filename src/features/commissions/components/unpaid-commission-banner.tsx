'use client';
import { usePathname } from 'next/navigation';
import { Notice } from '@/components/common/notice';
import { useAuthStore } from '@/store/auth-store';
import { formatINR } from '@/lib/utils';

/** Shown on /sell/* (except /sell/commissions and the auction form pages, which carry their own inline banner) while the seller owes commission. One slim notice above the page header. */
export function UnpaidCommissionBanner() {
  const pathname = usePathname();
  const unpaid = useAuthStore((s) => s.member?.unpaidCommissionPaise ?? 0);
  const isFormPage = pathname === '/sell/new' || /^\/sell\/auctions\/[^/]+\/edit$/.test(pathname);
  if (unpaid <= 0 || isFormPage || pathname.startsWith('/sell/commissions')) return null;
  return (
    <Notice action={{ label: 'Pay now', href: '/sell/commissions' }}>
      You have <strong>{formatINR(unpaid)}</strong> unpaid commission — pay it to create new auctions.
    </Notice>
  );
}
