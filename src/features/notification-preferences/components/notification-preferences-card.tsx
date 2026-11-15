'use client';
import * as React from 'react';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { PreferenceInput, PreferenceItem } from '../notification-preferences.api';
import { preferenceErrorMessage } from '../notification-preferences.errors';
import { useNotificationPreferences, useSavePreferences } from '../use-notification-preferences';

type Channel = 'email' | 'push' | 'whatsapp';
type Edits = Record<string, Partial<Record<Channel, boolean>>>;

const CHANNELS: { key: Channel; label: string }[] = [
  { key: 'email', label: 'Email' },
  { key: 'push', label: 'Push' },
  { key: 'whatsapp', label: 'WhatsApp' },
];

/** Items grouped by `group`, keeping the server's order of first appearance. */
function groupItems(items: PreferenceItem[]): [string, PreferenceItem[]][] {
  const map = new Map<string, PreferenceItem[]>();
  for (const i of items) map.set(i.group, [...(map.get(i.group) ?? []), i]);
  return [...map.entries()];
}

/** Notifications tab: per-type Email / Push / WhatsApp switches, saved with one PUT. */
export function NotificationPreferencesCard() {
  const prefs = useNotificationPreferences();
  const save = useSavePreferences();
  // Only the switches the member changed; everything else reads straight from the server data.
  const [edits, setEdits] = React.useState<Edits>({});

  const data = prefs.data;
  const value = (i: PreferenceItem, ch: Channel) => edits[i.type]?.[ch] ?? i[ch];
  const dirty = !!data && data.items.some((i) => CHANNELS.some(({ key }) => value(i, key) !== i[key]));

  const set = (type: string, ch: Channel, on: boolean) => setEdits((e) => ({ ...e, [type]: { ...e[type], [ch]: on } }));

  const onSave = () => {
    if (!data) return;
    const items: PreferenceInput[] = data.items.map((i) => ({ type: i.type, email: value(i, 'email'), push: value(i, 'push'), whatsapp: value(i, 'whatsapp') }));
    save.mutate(items, {
      onSuccess: () => {
        setEdits({});
        toast.success('Notification preferences saved');
      },
      onError: (e) => toast.error(preferenceErrorMessage(e, 'Could not save your preferences')),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notification preferences</CardTitle>
        <CardDescription>Choose how we reach you for each kind of alert.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {!data ? (
          prefs.isError ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{preferenceErrorMessage(prefs.error, 'Could not load your preferences')}</span>
              <Button variant="outline" size="sm" onClick={() => void prefs.refetch()}>
                Try again
              </Button>
            </div>
          ) : (
            <Skeleton className="h-48 w-full" />
          )
        ) : (
          <>
            <div className="hidden grid-cols-[1fr_repeat(3,5rem)] items-center gap-2 px-3 text-xs font-medium text-muted-foreground @lg/content:grid">
              <span />
              {CHANNELS.map((c) => (
                <span key={c.key} className="text-center">
                  {c.label}
                </span>
              ))}
            </div>
            {groupItems(data.items).map(([group, items]) => (
              <section key={group} aria-label={group} className="space-y-1">
                <h3 className="px-3 text-sm font-semibold">{group}</h3>
                <ul className="divide-y rounded-lg border">
                  {items.map((i) => (
                    <li key={i.type} className="grid grid-cols-3 items-center gap-2 p-3 @lg/content:grid-cols-[1fr_repeat(3,5rem)]">
                      <span className="col-span-3 text-sm @lg/content:col-span-1">{i.label}</span>
                      {CHANNELS.map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-2 @lg/content:justify-center">
                          <span className="text-xs text-muted-foreground @lg/content:sr-only">{label}</span>
                          {key === 'whatsapp' && !i.whatsappCapable ? (
                            <span className="text-xs text-muted-foreground" aria-hidden>
                              {'—'}
                            </span>
                          ) : key === 'email' && i.emailLocked ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span tabIndex={0} className="inline-flex items-center gap-1">
                                  <Switch aria-label={`${i.label} email`} checked disabled />
                                  <Lock className="h-3 w-3 text-muted-foreground" aria-hidden />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>This email is required, so it cannot be turned off.</TooltipContent>
                            </Tooltip>
                          ) : (
                            <Switch
                              aria-label={`${i.label} ${label}`}
                              checked={value(i, key)}
                              disabled={(key === 'whatsapp' && !data.whatsappOptIn) || save.isPending}
                              onCheckedChange={(on) => set(i.type, key, on)}
                            />
                          )}
                        </div>
                      ))}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <div className="flex justify-end">
              <Button onClick={onSave} disabled={!dirty || save.isPending}>
                {save.isPending ? 'Saving…' : 'Save preferences'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
