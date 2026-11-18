'use client';
import { usePathname } from 'next/navigation';
import { Notice } from '@/components/common/notice';
import { useAuthStore } from '@/store/auth-store';

/** Buying pages where the strike warning shows (and their sub-paths). */
const BUYING_PATHS = ['/my-bids', '/purchases', '/watchlist'];
const onBuyingPath = (pathname: string) => BUYING_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

/**
 * Warning for a member with unpaid-purchase strikes (`GET /members/me` `activeStrikes`). Rendered once by the member
 * layout; it shows only on the buying pages and renders nothing at 0 strikes.
 */
export function StrikeBanner() {
  const pathname = usePathname();
  const strikes = useAuthStore((s) => s.member?.activeStrikes ?? 0);
  if (strikes <= 0 || !onBuyingPath(pathname)) return null;
  return (
    <Notice>
      You have {strikes} {strikes === 1 ? 'strike' : 'strikes'} for unpaid purchases. With 2, every bid needs a deposit; with 3 your account is suspended. Strikes expire after 12 months.
    </Notice>
  );
}
