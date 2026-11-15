'use client';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toIndianMobile } from '@/features/members/members.schema';
import { useAuthStore } from '@/store/auth-store';
import { preferenceErrorMessage } from '../notification-preferences.errors';
import { useNotificationPreferences, useWhatsappOptIn } from '../use-notification-preferences';

/** Notifications tab, top card: WhatsApp opt-in. Needs a verified phone, so an unverified member is pointed at Security. */
export function WhatsappCard() {
  const phone = useAuthStore((s) => s.member?.phone);
  const prefs = useNotificationPreferences();
  const optIn = useWhatsappOptIn();
  const last4 = toIndianMobile(phone)?.slice(-4);

  const toggle = (on: boolean) =>
    optIn.mutate(on, {
      onSuccess: () => toast.success(on ? 'WhatsApp alerts turned on' : 'WhatsApp alerts turned off'),
      onError: (e) => toast.error(preferenceErrorMessage(e, 'Could not update WhatsApp alerts')),
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-4 w-4 text-primary" aria-hidden /> WhatsApp alerts
        </CardTitle>
        <CardDescription>Bidding alerts straight to your WhatsApp.</CardDescription>
      </CardHeader>
      <CardContent>
        {!prefs.data ? (
          prefs.isError ? (
            <p className="text-sm text-muted-foreground">{preferenceErrorMessage(prefs.error, 'Could not load WhatsApp settings')}</p>
          ) : (
            <Skeleton className="h-10 w-full" />
          )
        ) : !prefs.data.phoneVerified ? (
          <p className="text-sm text-muted-foreground">
            Verify your phone number to get alerts on WhatsApp.{' '}
            <Link href="/profile?tab=security" className="font-medium text-primary underline-offset-4 hover:underline">
              Verify in Security
            </Link>
          </p>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Get bidding alerts on WhatsApp at +91 •••••• {last4 ?? '••••'}. You can turn this off anytime.
            </p>
            <Switch aria-label="WhatsApp alerts" checked={prefs.data.whatsappOptIn} disabled={optIn.isPending} onCheckedChange={toggle} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
