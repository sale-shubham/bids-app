'use client';
import * as React from 'react';
import { BarChart3, Eye, Gavel, Heart, UserCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { StatCard } from '@/components/common/stat-card';
import { apiErrorMessage } from '@/lib/api-client';
import type { AnalyticsDays } from '../analytics.api';
import { useAuctionAnalytics } from '../use-analytics';
import { DailyChart } from './analytics-charts';
import { DaysSwitch } from './days-switch';

const n = (v: number) => v.toLocaleString('en-IN');

/** Manage page section: one auction's totals and daily views / bids. */
export function AuctionAnalyticsSection({ auctionId }: { auctionId: string }) {
  const [days, setDays] = React.useState<AnalyticsDays>(30);
  const q = useAuctionAnalytics(auctionId, days);
  const data = q.data;
  const empty = !!data && data.totals.views === 0 && data.totals.bids === 0 && data.totals.watchers === 0;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">Analytics</CardTitle>
        <DaysSwitch value={days} onChange={setDays} />
      </CardHeader>
      <CardContent>
        {q.isError && !data ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{apiErrorMessage(q.error, 'Could not load analytics')}</span>
            <Button variant="outline" size="sm" onClick={() => void q.refetch()}>
              Try again
            </Button>
          </div>
        ) : !data ? (
          <Skeleton className="h-48 w-full" />
        ) : empty ? (
          <EmptyState icon={BarChart3} title="No activity yet" description="Views, watchers and bids for this auction will show up here." />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 @lg/content:grid-cols-2 @3xl/content:grid-cols-5">
              <StatCard label="Views" value={n(data.totals.views)} icon={Eye} />
              <StatCard label="Unique viewers" value={n(data.totals.uniqueViewers)} icon={Users} />
              <StatCard label="Watchers" value={n(data.totals.watchers)} icon={Heart} />
              <StatCard label="Bids" value={n(data.totals.bids)} icon={Gavel} />
              <StatCard label="Bidders" value={n(data.totals.bidders)} icon={UserCheck} />
            </div>
            <DailyChart data={data.daily} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
