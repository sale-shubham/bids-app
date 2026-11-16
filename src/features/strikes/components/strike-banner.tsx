'use client';
import { Notice } from '@/components/common/notice';
import { useAuthStore } from '@/store/auth-store';

/** Warning for a member with unpaid-purchase strikes (`GET /members/me` `activeStrikes`). Renders nothing at 0. */
export function StrikeBanner() {
  const strikes = useAuthStore((s) => s.member?.activeStrikes ?? 0);
  if (strikes <= 0) return null;
  return (
    <Notice>
      You have {strikes} {strikes === 1 ? 'strike' : 'strikes'} for unpaid purchases. With 2, every bid needs a deposit; with 3 your account is suspended. Strikes expire after 12 months.
    </Notice>
  );
}
