'use client';
import { useRouter } from 'next/navigation';
import { UserCheck, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { followErrorMessage } from '../follows.errors';
import { useFollowState, useToggleFollow } from '../use-follows';

interface FollowButtonProps {
  sellerId: string;
  /** The target's role when known; anything but AUCTIONEER hides the button. */
  sellerRole?: string;
  /** Server-rendered follower count, shown until the live state loads (and to guests). */
  initialFollowerCount?: number;
  /** Compact button (seller card on the auction page): no count, smaller. */
  compact?: boolean;
  /** Show "N followers" next to the button (seller page header). */
  showCount?: boolean;
}

const plural = (n: number) => `${n.toLocaleString('en-IN')} ${n === 1 ? 'follower' : 'followers'}`;

// Follow / Following toggle for a seller. Optimistic with rollback; guests are
// sent to /login?next=<here>. Hidden on your own profile, for admins and for
// targets that are not auctioneers.
export function FollowButton({ sellerId, sellerRole, initialFollowerCount, compact = false, showCount = false }: FollowButtonProps) {
  const router = useRouter();
  const member = useAuthStore((s) => s.member);
  const initialized = useAuthStore((s) => s.initialized);
  const state = useFollowState(sellerId, initialFollowerCount);
  const toggle = useToggleFollow(sellerId);

  const following = !!member && !!state.data?.following;
  const count = state.data?.followerCount ?? initialFollowerCount;
  const eligible = (!sellerRole || sellerRole === 'AUCTIONEER') && member?.id !== sellerId && member?.role !== 'SUPER_ADMIN';

  const onClick = () => {
    if (!member) {
      if (!initialized) return;
      const here = window.location.pathname + window.location.search;
      router.push(`/login?next=${encodeURIComponent(here)}`);
      return;
    }
    toggle.mutate(
      { follow: !following },
      { onError: (e) => toast.error(followErrorMessage(e, following ? 'Could not unfollow' : 'Could not follow')) },
    );
  };

  const button = eligible && (
    <Button
      type="button"
      size="sm"
      variant={following ? 'outline' : 'default'}
      aria-pressed={following}
      disabled={!!member && state.isPlaceholderData}
      onClick={onClick}
      className={compact ? 'h-8 px-2.5 text-xs' : undefined}
    >
      {following ? <UserCheck className="h-4 w-4" aria-hidden /> : <UserPlus className="h-4 w-4" aria-hidden />}
      {following ? 'Following' : 'Follow'}
    </Button>
  );

  if (!button && !(showCount && count !== undefined)) return null;
  return (
    <div className={compact ? 'flex items-center' : 'flex flex-wrap items-center justify-center gap-3 @lg/content:justify-start'}>
      {button}
      {showCount && count !== undefined && (
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-4 w-4" aria-hidden /> {plural(count)}
        </span>
      )}
    </div>
  );
}
