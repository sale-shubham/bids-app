'use client';
import Link from 'next/link';
import { AlertTriangle, Banknote, CalendarClock, Clock, Gavel, Hammer, Megaphone, Receipt, Users, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Figure, FigureStrip } from '@/components/common/figure';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { AuctionStatusBadge, CoverImage } from '@/features/auctions/components/auction-card';
import { RevenueBarChart, SignupsLineChart } from '@/features/admin/components/admin-charts';
import { useAdminDashboard } from '@/features/admin/use-admin';
import { apiErrorMessage } from '@/lib/api-client';
import { formatDate, formatINR } from '@/lib/utils';

export default function AdminDashboardPage() {
  const { data, isLoading, error, refetch } = useAdminDashboard();

  return (
    <div className="space-y-4">
      <PageHeader title="Admin dashboard" />

      {error && !data ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{apiErrorMessage(error, 'Could not load the dashboard')}</p>
            <Button variant="outline" onClick={() => void refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : isLoading || !data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 @lg/content:grid-cols-3 @3xl/content:grid-cols-5">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
          <div className="grid gap-4 @3xl/content:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      ) : (
        <>
          <FigureStrip cols={5}>
            <Figure label="Members" value={data.totals.members.toLocaleString('en-IN')} icon={Users} href="/admin/members" />
            <Figure label="Buyers" value={data.totals.buyers.toLocaleString('en-IN')} icon={UserCheck} />
            <Figure label="Sellers" value={data.totals.sellers.toLocaleString('en-IN')} icon={Megaphone} href="/admin/members?seller=true" />
            <Figure label="Live auctions" value={data.totals.liveAuctions} icon={Gavel} tone="success" href="/admin/auctions?status=live" />
            <Figure label="Upcoming auctions" value={data.totals.upcomingAuctions} icon={CalendarClock} tone="warning" href="/admin/auctions?status=upcoming" />
            <Figure label="Ended auctions" value={data.totals.endedAuctions} icon={Clock} href="/admin/auctions?status=ended" />
            <Figure label="Bids today" value={data.totals.bidsToday.toLocaleString('en-IN')} icon={Hammer} />
            <Figure label="Commission paid" value={formatINR(data.totals.commissionPaidPaise)} icon={Banknote} tone="success" href="/admin/commissions?status=paid" />
            <Figure
              label="Commission due"
              value={formatINR(data.totals.commissionDuePaise)}
              icon={Receipt}
              tone="warning"
              attention={data.totals.commissionDuePaise > 0}
              href="/admin/commissions?status=due"
            />
          </FigureStrip>

          <div className="grid gap-4 @3xl/content:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Commission revenue by month</CardTitle>
              </CardHeader>
              <CardContent>
                {data.revenueByMonth.length ? (
                  <RevenueBarChart data={data.revenueByMonth} />
                ) : (
                  <EmptyState icon={Banknote} title="No revenue yet" description="Commission revenue appears here." />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Signups by month</CardTitle>
              </CardHeader>
              <CardContent>
                {data.signupsByMonth.length ? (
                  <SignupsLineChart data={data.signupsByMonth} />
                ) : (
                  <EmptyState icon={Users} title="No signups yet" description="New members appear here." />
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Recent auctions</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/auctions">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {data.recentAuctions.length === 0 ? (
                <EmptyState icon={Gavel} title="No auctions yet" description="New auctions appear here." />
              ) : (
                <ul className="divide-y">
                  {data.recentAuctions.map((a) => (
                    <li key={a.id}>
                      <Link href={`/auctions/${a.id}`} className="flex items-center gap-3 py-3 hover:bg-muted/40">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                          <CoverImage src={a.coverImage} alt={a.title} sizes="48px" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{a.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {a.seller.name} · {a.bidCount} {a.bidCount === 1 ? 'bid' : 'bids'} · {formatDate(a.endTime)}
                          </p>
                        </div>
                        <div className="hidden text-right text-sm tnum @lg/content:block">
                          {formatINR(a.bidCount > 0 ? a.currentBidPaise : a.startingBidPaise)}
                        </div>
                        <AuctionStatusBadge status={a.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
