'use client';
import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle, BarChart3, Banknote, Eye, Gavel, Heart, PackageCheck, Users, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/common/empty-state';
import { SortableTableHead } from '@/components/common/sortable-table-head';
import { StatCard } from '@/components/common/stat-card';
import { useSortedItems, useSortState } from '@/components/common/use-sortable-data';
import { apiErrorMessage } from '@/lib/api-client';
import { formatINR } from '@/lib/utils';
import type { AnalyticsDays } from '../analytics.api';
import { useSellerAnalytics } from '../use-analytics';
import { DailyChart } from './analytics-charts';
import { DaysSwitch } from './days-switch';

const n = (v: number) => v.toLocaleString('en-IN');

const COLUMNS: { key: string; label: string; right?: boolean }[] = [
  { key: 'title', label: 'Auction' },
  { key: 'status', label: 'Status' },
  { key: 'views', label: 'Views', right: true },
  { key: 'uniqueViewers', label: 'Unique', right: true },
  { key: 'watchers', label: 'Watchers', right: true },
  { key: 'bids', label: 'Bids', right: true },
  { key: 'bidders', label: 'Bidders', right: true },
  { key: 'currentBidPaise', label: 'Current bid', right: true },
];

/** /sell/analytics: KPI tiles, views + bids per day, and a sortable per-auction table. */
export function SellerAnalyticsPage() {
  const [days, setDays] = React.useState<AnalyticsDays>(30);
  const q = useSellerAnalytics(days);
  const { sortConfig, requestSort } = useSortState();
  const rows = useSortedItems(q.data?.auctions ?? [], sortConfig);
  const data = q.data;
  const empty = !!data && data.totals.views === 0 && data.totals.bids === 0 && data.auctions.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 @lg/content:flex-row @lg/content:items-end @lg/content:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">How buyers find and respond to your auctions.</p>
        </div>
        <DaysSwitch value={days} onChange={setDays} />
      </div>

      {q.isError && !data ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{apiErrorMessage(q.error, 'Could not load your analytics')}</p>
            <Button variant="outline" onClick={() => void q.refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : !data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 @lg/content:grid-cols-2 @3xl/content:grid-cols-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-72" />
        </div>
      ) : empty ? (
        <EmptyState icon={BarChart3} title="No activity yet" description="Views, watchers and bids show up here once your auctions get attention." actionLabel="Create an auction" actionHref="/sell/new" />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 @lg/content:grid-cols-2 @3xl/content:grid-cols-4">
            <StatCard label="Views" value={n(data.totals.views)} icon={Eye} />
            <StatCard label="Unique viewers" value={n(data.totals.uniqueViewers)} icon={Users} />
            <StatCard label="Watchers" value={n(data.totals.watchers)} icon={Heart} />
            <StatCard label="Bids" value={n(data.totals.bids)} icon={Gavel} />
            <StatCard label="Bidders" value={n(data.totals.bidders)} icon={UserCheck} />
            <StatCard label="Sold" value={n(data.totals.sold)} icon={PackageCheck} tone="success" />
            <StatCard label="Revenue" value={formatINR(data.totals.revenuePaise)} icon={Banknote} tone="success" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Views and bids per day</CardTitle>
            </CardHeader>
            <CardContent>
              <DailyChart data={data.daily} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your auctions</CardTitle>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No auctions had activity in this range.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {COLUMNS.map((c) => (
                          <SortableTableHead key={c.key} sortKey={c.key} sortConfig={sortConfig} onSort={requestSort} className={c.right ? 'text-right' : undefined}>
                            {c.label}
                          </SortableTableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="max-w-64 truncate font-medium">
                            <Link href={`/sell/auctions/${a.id}`} className="hover:underline">
                              {a.title}
                            </Link>
                          </TableCell>
                          <TableCell className="capitalize">{a.status.toLowerCase()}</TableCell>
                          <TableCell className="text-right tnum">{n(a.views)}</TableCell>
                          <TableCell className="text-right tnum">{n(a.uniqueViewers)}</TableCell>
                          <TableCell className="text-right tnum">{n(a.watchers)}</TableCell>
                          <TableCell className="text-right tnum">{n(a.bids)}</TableCell>
                          <TableCell className="text-right tnum">{n(a.bidders)}</TableCell>
                          <TableCell className="text-right tnum">{formatINR(a.currentBidPaise)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
