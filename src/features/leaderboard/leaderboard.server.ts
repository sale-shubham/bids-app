import { serverGet } from '@/lib/server-api';

export type LeaderboardBy = 'spent' | 'won';

export interface LeaderboardEntry {
  rank: number;
  member: { id: string; displayName: string; avatarUrl: string | null };
  auctionsWon: number;
  moneySpentPaise: number;
}

/** Null when the API fails (the page shows an error note instead of crashing). */
export async function getLeaderboardServer(by: LeaderboardBy, limit = 20): Promise<LeaderboardEntry[] | null> {
  try {
    const d = await serverGet<{ entries?: LeaderboardEntry[] }>('/leaderboard', {
      params: { by, limit },
      revalidate: 60,
      notFoundOn404: false,
    });
    return Array.isArray(d?.entries) ? d.entries : [];
  } catch {
    return null;
  }
}
