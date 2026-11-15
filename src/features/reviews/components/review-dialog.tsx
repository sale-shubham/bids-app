'use client';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiErrorCode } from '@/lib/api-client';
import { reviewErrorMessage } from '../reviews.errors';
import { reviewSchema, toReviewPayload, type ReviewFormValues } from '../reviews.schema';
import { useCreateReview } from '../use-reviews';
import { StarRatingInput } from './star-rating';

interface ReviewDialogProps {
  auctionId: string;
  sellerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** "Rate the seller": 1-5 stars plus an optional comment, for the winner of an auction. */
export function ReviewDialog({ auctionId, sellerName, open, onOpenChange }: ReviewDialogProps) {
  const create = useCreateReview(auctionId);
  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 0, comment: '' },
  });
  const { errors } = form.formState;

  React.useEffect(() => {
    if (!open) form.reset({ rating: 0, comment: '' });
  }, [open, form]);

  const onSubmit = (values: ReviewFormValues) =>
    create.mutate(toReviewPayload(values), {
      onSuccess: () => {
        toast.success('Thanks for rating the seller');
        onOpenChange(false);
      },
      onError: (e) => {
        toast.error(reviewErrorMessage(e, 'Could not submit your rating'));
        const code = apiErrorCode(e);
        if (code === 'ALREADY_REVIEWED' || code === 'REVIEW_NOT_ALLOWED') onOpenChange(false);
      },
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rate the seller</DialogTitle>
          <DialogDescription>
            How was your experience with {sellerName}? Your rating is public and cannot be changed later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label>Rating</Label>
            <Controller
              control={form.control}
              name="rating"
              render={({ field }) => <StarRatingInput value={field.value} onChange={field.onChange} disabled={create.isPending} />}
            />
            {errors.rating && <p className="text-xs text-destructive">{errors.rating.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="review-comment">Comment (optional)</Label>
            <Textarea
              id="review-comment"
              rows={4}
              maxLength={1000}
              placeholder="Item as described? Smooth delivery?"
              aria-invalid={!!errors.comment}
              {...form.register('comment')}
            />
            {errors.comment && <p className="text-xs text-destructive">{errors.comment.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Submit rating
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
