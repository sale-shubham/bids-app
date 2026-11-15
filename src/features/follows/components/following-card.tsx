'use client';
import Link from 'next/link';
import { Gavel, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { InfiniteScroll } from '@/components/common/infinite-scroll';
import { MemberAvatar } from '@/components/common/member-avatar';
import { VerifiedBadge } from '@/components/common/verified-badge';
import { RatingSummary } from '@/features/reviews/components/star-rating';
import { formatDate } from '@/lib/utils';
import { followErrorMessage } from '../follows.errors';
import { useFollowing, useUnfollowFromList } from '../use-follows';

/** Profile > Following: the sellers the member follows, with unfollow. */
export function FollowingCard() {
  const list = useFollowing();
  const unfollow = useUnfollowFromList();
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

  const onUnfollow = (id: string, name: string) =>
    unfollow.mutate(id, {
      onSuccess: () => toast.success(`Unfollowed ${name}`),
      onError: (e) => toast.error(followErrorMessage(e, 'Could not unfollow')),
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Following</CardTitle>
        <CardDescription>We notify you when a seller you follow lists a new auction.</CardDescription>
      </CardHeader>
      <CardContent>
        {list.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : list.isError && items.length === 0 ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{followErrorMessage(list.error, 'Could not load the sellers you follow')}</span>
            <Button variant="outline" size="sm" onClick={() => void list.refetch()}>
              Try again
            </Button>
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={Users} title="Not following anyone yet" description="Follow a seller from their page or an auction to hear about their new listings." actionLabel="Browse auctions" actionHref="/auctions" />
        ) : (
          <>
            <ul className="space-y-3">
              {items.map((s) => (
                <li key={s.id} className="flex flex-col gap-3 rounded-lg border p-3 @lg/content:flex-row @lg/content:items-center @lg/content:justify-between">
                  <Link href={`/sellers/${s.id}`} className="flex min-w-0 items-center gap-3 hover:underline">
                    <MemberAvatar id={s.id} name={s.name} email="" avatarUrl={s.avatarUrl} size="md" />
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate font-medium">
                        {s.name}
                        <VerifiedBadge verified={s.verified} />
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                        <RatingSummary avg={s.ratingAvg} count={s.ratingCount} />
                        <span className="inline-flex items-center gap-1">
                          <Gavel className="h-3 w-3" aria-hidden /> {s.activeAuctions} live
                        </span>
                        <span>Followed {formatDate(s.followedAt)}</span>
                      </div>
                    </div>
                  </Link>
                  <Button variant="outline" size="sm" onClick={() => onUnfollow(s.id, s.name)} aria-label={`Unfollow ${s.name}`}>
                    Unfollow
                  </Button>
                </li>
              ))}
            </ul>
            <InfiniteScroll onLoadMore={() => void list.fetchNextPage()} hasMore={!!list.hasNextPage} loading={list.isFetchingNextPage} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
