import Link from 'next/link';
import type { Metadata } from 'next';
import { Trophy } from 'lucide-react';
import { EmptyState } from '@/components/common/empty-state';
import { cn } from '@/lib/utils';
import { getLeaderboardServer, type LeaderboardBy } from '@/features/leaderboard/leaderboard.server';
import { LeaderboardTable, Podium } from '@/features/leaderboard/components/leaderboard-view';

const TABS: { by: LeaderboardBy; label: string }[] = [
  { by: 'spent', label: 'Top spenders' },
  { by: 'won', label: 'Most wins' },
];

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const by = (await searchParams).by === 'won' ? 'won' : 'spent';
  return {
    title: `Leaderboard: ${by === 'won' ? 'Most wins' : 'Top spenders'} — NobleBid`,
    description: 'See the top bidders on NobleBid, ranked by money spent and auctions won.',
    alternates: { canonical: '/leaderboard' },
  };
}

export default async function LeaderboardPage({ searchParams }: Props) {
  const by: LeaderboardBy = (await searchParams).by === 'won' ? 'won' : 'spent';
  const entries = await getLeaderboardServer(by, 20);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground">NobleBid&apos;s most active bidders.</p>
      </div>
      <nav aria-label="Ranking" className="inline-flex gap-1 rounded-lg bg-muted p-1">
        {TABS.map((t) => (
          <Link
            key={t.by}
            aria-current={by === t.by ? 'page' : undefined}
            href={t.by === 'spent' ? '/leaderboard' : `/leaderboard?by=${t.by}`}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition',
              by === t.by ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {entries === null ? (
        <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
          The leaderboard could not be loaded right now. Please try again shortly.
        </p>
      ) : entries.length === 0 ? (
        <EmptyState icon={Trophy} title="No rankings yet" description="Win an auction to appear here." actionLabel="Browse auctions" actionHref="/auctions" />
      ) : (
        <>
          <Podium entries={entries} by={by} />
          <LeaderboardTable entries={entries} by={by} />
        </>
      )}
    </div>
  );
}
