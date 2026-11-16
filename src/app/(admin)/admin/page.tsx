'use client';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Banknote, CalendarClock, Clock, Gavel, Hammer, Megaphone, Receipt, Users, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { AuctionStatusBadge, CoverImage } from '@/features/auctions/components/auction-card';
import { RevenueBarChart, SignupsLineChart } from '@/features/admin/components/admin-charts';
import { useAdminDashboard } from '@/features/admin/use-admin';
import { apiErrorMessage } from '@/lib/api-client';
import { cn, formatDate, formatINR } from '@/lib/utils';

type Tone = 'default' | 'success' | 'warning';
const TONE: Record<Tone, string> = { default: 'text-primary', success: 'text-success', warning: 'text-warning' };

/** One compact figure in the strip; a link when it has a page of its own. */
function Figure({ label, value, icon: Icon, tone = 'default', href, attention }: { label: string; value: string | number; icon: LucideIcon; tone?: Tone; href?: string; attention?: boolean }) {
  const body = (
    <>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className={cn('h-3.5 w-3.5 shrink-0', TONE[tone])} aria-hidden />
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-0.5 truncate text-lg font-semibold tnum">{value}</p>
    </>
  );
  const cls = cn('min-w-0 rounded-lg border bg-card px-3 py-2', attention && 'border-warning/60');
  return href ? (
    <Link href={href} className={cn(cls, 'transition-colors hover:bg-muted/40')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

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
          <div className="grid grid-cols-2 gap-2 @lg/content:grid-cols-3 @3xl/content:grid-cols-5" aria-label="Figures">
            <Figure label="Members" value={data.totals.members.toLocaleString('en-IN')} icon={Users} href="/admin/members" />
            <Figure label="Bidders" value={data.totals.bidders.toLocaleString('en-IN')} icon={UserCheck} href="/admin/members?role=BIDDER" />
            <Figure label="Auctioneers" value={data.totals.auctioneers.toLocaleString('en-IN')} icon={Megaphone} href="/admin/members?role=AUCTIONEER" />
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
          </div>

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
