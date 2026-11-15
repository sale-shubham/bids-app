'use client';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';

// Persistent banner on admin pages while the server requires admin 2FA and this
// account has not set it up (`twoFactorSetupRequired` from /members/me, or set by
// the api-client when an admin call returns TWO_FACTOR_SETUP_REQUIRED).
export function TwoFactorSetupBanner() {
  const required = useAuthStore((s) => s.member?.twoFactorSetupRequired === true);
  if (!required) return null;
  return (
    <div
      role="alert"
      className="mb-6 flex flex-col gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 @lg/content:flex-row @lg/content:items-center @lg/content:justify-between"
    >
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
        <div>
          <p className="font-medium">Two-factor authentication is required for the admin area</p>
          <p className="text-sm text-muted-foreground">Turn it on to keep using admin pages. Until then, most admin actions are blocked.</p>
        </div>
      </div>
      <Button asChild size="sm">
        <Link href="/admin/profile?tab=security">Set up now</Link>
      </Button>
    </div>
  );
}
