'use client';
import * as React from 'react';
import Link from 'next/link';
import { BellRing } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { savedSearchErrorMessage } from '../saved-searches.errors';
import type { SavedSearchDTO } from '../saved-searches.types';
import { savedSearchHref, summarizeSavedSearch } from '../saved-searches.utils';
import { useDeleteSavedSearch, useSavedSearches } from '../use-saved-searches';

/** Profile > Alerts: the bidder's saved searches. */
export function AlertsCard() {
  const list = useSavedSearches();
  const del = useDeleteSavedSearch();
  const [target, setTarget] = React.useState<SavedSearchDTO | null>(null);
  const items = list.data ?? [];

  const confirm = () => {
    if (!target) return;
    del.mutate(target.id, {
      onSuccess: () => {
        toast.success('Alert deleted');
        setTarget(null);
      },
      onError: (e) => {
        toast.error(savedSearchErrorMessage(e, 'Could not delete the alert'));
        setTarget(null);
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search alerts</CardTitle>
        <CardDescription>We notify you when a new auction matches one of these searches.</CardDescription>
      </CardHeader>
      <CardContent>
        {list.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : list.isError ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{savedSearchErrorMessage(list.error, 'Could not load your alerts')}</span>
            <Button variant="outline" size="sm" onClick={() => void list.refetch()}>
              Try again
            </Button>
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={BellRing} title="No saved searches" description="Search or filter auctions, then choose Save this search." actionLabel="Browse auctions" actionHref="/auctions" />
        ) : (
          <ul className="space-y-3">
            {items.map((s) => (
              <li key={s.id} className="flex flex-col gap-3 rounded-lg border p-3 @lg/content:flex-row @lg/content:items-center @lg/content:justify-between">
                <div className="min-w-0">
                  {s.name && <p className="truncate font-medium">{s.name}</p>}
                  <p className="wrap-break-word text-sm text-muted-foreground">{summarizeSavedSearch(s)}</p>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={savedSearchHref(s)}>View results</Link>
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setTarget(s)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <ConfirmDialog
        open={!!target}
        onOpenChange={(o) => !o && setTarget(null)}
        title="Delete this alert?"
        description="You will stop getting notifications for new matches."
        confirmLabel="Delete"
        variant="destructive"
        loading={del.isPending}
        onConfirm={confirm}
      />
    </Card>
  );
}
