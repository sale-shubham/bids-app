import Link from 'next/link';
import { Crown, Trophy } from 'lucide-react';
import { MemberAvatar } from '@/components/common/member-avatar';
import { cn, formatINR } from '@/lib/utils';
import type { LeaderboardBy, LeaderboardEntry } from '../leaderboard.server';

const wins = (n: number) => `${n} ${n === 1 ? 'win' : 'wins'}`;

const PODIUM_STYLE: Record<number, string> = {
  1: 'border-amber-500/50 bg-amber-500/10 sm:-mt-4 sm:pb-8',
  2: 'border-slate-400/50 bg-slate-400/10',
  3: 'border-orange-700/40 bg-orange-700/10',
};

export function Podium({ entries, by }: { entries: LeaderboardEntry[]; by: LeaderboardBy }) {
  const top = entries.slice(0, 3);
  // Visual order 2-1-3 on wide screens; rank order on mobile.
  const ordered = [top[1], top[0], top[2]].filter(Boolean) as LeaderboardEntry[];
  return (
    <ol className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3" aria-label="Top three">
      {ordered.map((e) => (
        <li
          key={e.member.id}
          className={cn(
            'flex flex-col items-center gap-2 rounded-xl border p-4 text-center',
            PODIUM_STYLE[e.rank] ?? '',
            e.rank === 1 && 'order-first sm:order-none',
          )}
        >
          {e.rank === 1 ? (
            <Crown className="h-6 w-6 text-amber-500" aria-hidden />
          ) : (
            <Trophy className="h-5 w-5 text-muted-foreground" aria-hidden />
          )}
          <MemberAvatar id={e.member.id} name={e.member.displayName} email="" avatarUrl={e.member.avatarUrl} size="lg" />
          <p className="max-w-full truncate font-semibold">{e.member.displayName}</p>
          <p className="text-lg font-bold text-primary">{by === 'spent' ? formatINR(e.moneySpentPaise) : wins(e.auctionsWon)}</p>
          <p className="text-xs text-muted-foreground">
            #{e.rank} · {by === 'spent' ? wins(e.auctionsWon) : `${formatINR(e.moneySpentPaise)} spent`}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function LeaderboardTable({ entries, by }: { entries: LeaderboardEntry[]; by: LeaderboardBy }) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="w-14 px-3 py-2 font-medium">Rank</th>
            <th className="px-3 py-2 font-medium">Bidder</th>
            <th className="px-3 py-2 text-right font-medium">Wins</th>
            <th className="px-3 py-2 text-right font-medium">Spent</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {entries.map((e) => (
            <tr key={e.member.id}>
              <td className="px-3 py-2.5 font-semibold text-muted-foreground">{e.rank}</td>
              <td className="px-3 py-2.5">
                <span className="flex items-center gap-2">
                  <MemberAvatar id={e.member.id} name={e.member.displayName} email="" avatarUrl={e.member.avatarUrl} size="sm" />
                  <span className="truncate font-medium">{e.member.displayName}</span>
                </span>
              </td>
              <td className={cn('px-3 py-2.5 text-right', by === 'won' && 'font-semibold text-primary')}>{e.auctionsWon}</td>
              <td className={cn('px-3 py-2.5 text-right', by === 'spent' && 'font-semibold text-primary')}>{formatINR(e.moneySpentPaise)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Top-5 compact list for the home page. */
export function TopBidders({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <section className="space-y-4" aria-label="Top bidders">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Top bidders</h2>
        <Link href="/leaderboard" className="text-sm font-medium text-primary hover:underline">
          Full leaderboard
        </Link>
      </div>
      <ol className="divide-y rounded-xl border">
        {entries.map((e) => (
          <li key={e.member.id} className="flex items-center gap-3 px-4 py-3">
            <span className="w-6 text-sm font-semibold text-muted-foreground">{e.rank}</span>
            <MemberAvatar id={e.member.id} name={e.member.displayName} email="" avatarUrl={e.member.avatarUrl} size="sm" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{e.member.displayName}</span>
            <span className="hidden text-sm text-muted-foreground sm:inline">{wins(e.auctionsWon)}</span>
            <span className="text-sm font-semibold text-primary">{formatINR(e.moneySpentPaise)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
