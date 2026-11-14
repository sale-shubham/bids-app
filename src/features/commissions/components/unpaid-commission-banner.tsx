'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { formatINR } from '@/lib/utils';

/** Shown on /sell/* (except /sell/commissions) while the seller owes commission. */
export function UnpaidCommissionBanner() {
  const pathname = usePathname();
  const unpaid = useAuthStore((s) => s.member?.unpaidCommissionPaise ?? 0);
  if (unpaid <= 0 || pathname.startsWith('/sell/commissions')) return null;
  return (
    <div
      role="alert"
      className="mb-6 flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm @lg/content:flex-row @lg/content:items-center @lg/content:justify-between"
    >
      <p className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
        <span>
          You have <strong>{formatINR(unpaid)}</strong> unpaid commission — pay it to create new auctions.
        </span>
      </p>
      <Button asChild size="sm">
        <Link href="/sell/commissions">Pay now</Link>
      </Button>
    </div>
  );
}
