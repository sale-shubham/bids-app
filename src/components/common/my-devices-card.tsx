'use client';
import * as React from 'react';
import { toast } from 'sonner';
import { Laptop, Monitor, Smartphone, Tablet, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useMySessions, useRevokeSession } from '@/features/auth/use-auth';
import { apiErrorMessage } from '@/lib/api-client';
import { formatListTime } from '@/lib/utils';
import type { DeviceSession } from '@/features/auth/auth.api';

function deviceLabel(s: DeviceSession): string {
  const info = s.deviceInfo;
  if (!info) return s.userAgent ?? 'Unknown device';
  const parts = [info.browser, info.os].filter((p) => p && p !== 'Unknown');
  // getDeviceInfo() falls back to the OS name for `device`, so only show it
  // when it is an actual model.
  if (info.device && info.device !== info.os && info.device !== 'Unknown') parts.push(info.device);
  return parts.join(' · ') || s.userAgent || 'Unknown device';
}

function DeviceIcon({ type }: { type?: string }) {
  const Icon = type === 'mobile' ? Smartphone : type === 'tablet' ? Tablet : type === 'desktop' ? Monitor : Laptop;
  return <Icon className="h-5 w-5 text-primary" />;
}

// Loopback IPs (::1, 127.0.0.1) only ever show up in local dev — the API
// server and the browser are the same machine, so the raw address just
// confuses whoever reads this list. Label it plainly instead.
const LOOPBACK_IPS = new Set(['::1', '127.0.0.1', '::ffff:127.0.0.1']);
function formatIp(ip?: string | null): string | null {
  if (!ip) return null;
  return LOOPBACK_IPS.has(ip) ? 'localhost (dev machine)' : ip;
}

// This account's own logged-in devices, with self-service remove — the
// Profile page's Devices tab, for members and super admins alike. The tab only
// exists when `limit` (the account's own cap, `AuthMember.deviceLimit`) is
// above 1: with one device allowed there is never anything else to sign out.
// Past the cap, a new sign-in signs out the oldest device (bids-api's auth.md).
export function MyDevicesCard({ limit }: { limit: number }) {
  const { data: sessions, isLoading } = useMySessions();
  const revoke = useRevokeSession();
  const [toRemove, setToRemove] = React.useState<DeviceSession | null>(null);

  const onConfirm = async () => {
    if (!toRemove) return;
    try {
      await revoke.mutateAsync(toRemove.id);
      toast.success('Device signed out');
      setToRemove(null);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Logged-in devices</CardTitle>
        <CardDescription>
          {sessions ? `Signed in on ${sessions.length} of ${limit} devices. ` : `Up to ${limit} devices can be signed in. `}
          Signing in on another device past the limit signs out the oldest one.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : !sessions?.length ? (
          <p className="text-sm text-muted-foreground">No devices found.</p>
        ) : (
          <div className="divide-y overflow-hidden rounded-lg border">
            {sessions.map((s) => {
              const ip = formatIp(s.ip);
              return (
                <div key={s.id} className="flex items-center gap-3 px-3 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <DeviceIcon type={s.deviceInfo?.type} />
                  </span>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium" title={deviceLabel(s)}>{deviceLabel(s)}</span>
                      {s.isCurrent && <Badge variant="success">This device</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last active {formatListTime(s.lastUsedAt)}
                      {ip ? ` · ${ip}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">Signed in {formatListTime(s.createdAt)}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0 text-destructive hover:text-destructive"
                    aria-label={`Remove ${deviceLabel(s)}`}
                    onClick={() => setToRemove(s)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={!!toRemove}
        onOpenChange={(o) => !o && setToRemove(null)}
        title="Remove Device"
        description={
          toRemove
            ? `"${deviceLabel(toRemove)}" will be signed out immediately${toRemove.isCurrent ? ' — this is the device you are using now, so you will be logged out' : ''}.`
            : undefined
        }
        confirmLabel="Remove"
        variant="destructive"
        loading={revoke.isPending}
        onConfirm={onConfirm}
      />
    </Card>
  );
}
