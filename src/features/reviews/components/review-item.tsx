'use client';
import * as React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ReportButton } from '@/features/reports/components/report-button';
import { reviewErrorMessage } from '../reviews.errors';
import { replySchema } from '../reviews.schema';
import type { ReviewDTO } from '../reviews.types';
import { useReplyToReview } from '../use-reviews';
import { StarDisplay } from './star-rating';

function ReplyForm({ reviewId, onDone }: { reviewId: string; onDone: () => void }) {
  const reply = useReplyToReview();
  const [text, setText] = React.useState('');
  const [error, setError] = React.useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = replySchema.safeParse({ reply: text });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid reply');
      return;
    }
    setError('');
    reply.mutate(
      { id: reviewId, reply: parsed.data.reply },
      {
        onSuccess: () => {
          toast.success('Reply posted');
          onDone();
        },
        onError: (err) => toast.error(reviewErrorMessage(err, 'Could not post your reply')),
      },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-2" noValidate>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Write a public reply"
        aria-label="Reply to this review"
        aria-invalid={!!error}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={reply.isPending}>
          Post reply
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone} disabled={reply.isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

interface ReviewItemProps {
  review: ReviewDTO;
  /** The viewer is the reviewed seller: offer "Reply" while there is none. */
  canReply?: boolean;
  /** Link the auction title (hidden where the auction is already the page). */
  showAuction?: boolean;
}

export function ReviewItem({ review, canReply, showAuction = true }: ReviewItemProps) {
  const [replying, setReplying] = React.useState(false);
  return (
    <li className="space-y-2 rounded-xl border p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <StarDisplay rating={review.rating} />
        <span className="text-sm font-medium">{review.reviewerLabel}</span>
        <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}</span>
      </div>
      {showAuction && (
        <Link href={`/auctions/${review.auctionId}`} className="block text-xs text-muted-foreground hover:underline">
          {review.auctionTitle}
        </Link>
      )}
      {review.comment && <p className="whitespace-pre-line wrap-break-word text-sm">{review.comment}</p>}
      {review.sellerReply ? (
        <div className="rounded-lg bg-muted/60 p-3 text-sm">
          <p className="text-xs font-medium text-muted-foreground">Seller reply</p>
          <p className="whitespace-pre-line wrap-break-word">{review.sellerReply}</p>
        </div>
      ) : canReply ? (
        replying ? (
          <ReplyForm reviewId={review.id} onDone={() => setReplying(false)} />
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setReplying(true)}>
            Reply
          </Button>
        )
      ) : null}
      <div>
        <ReportButton targetType="REVIEW" targetId={review.id} subject="this review" hidden={review.isMine} />
      </div>
    </li>
  );
}
