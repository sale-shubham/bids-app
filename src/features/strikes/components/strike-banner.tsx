'use client';
import { AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

/** Warning for a member with unpaid-purchase strikes (`GET /members/me` `activeStrikes`). Renders nothing at 0. */
export function StrikeBanner() {
  const strikes = useAuthStore((s) => s.member?.activeStrikes ?? 0);
  if (strikes <= 0) return null;
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>
        You have {strikes} {strikes === 1 ? 'strike' : 'strikes'} for unpaid purchases. With 2, every bid needs a deposit; with 3 your account is suspended. Strikes expire after 12 months.
      </p>
    </div>
  );
}
