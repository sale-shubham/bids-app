import { z } from '@/lib/zod';

export const REVIEW_COMMENT_MAX = 1000;

export const reviewSchema = z.object({
  rating: z.number({ message: 'Choose a rating' }).int().min(1, 'Choose a rating').max(5, 'Choose a rating'),
  comment: z.string().trim().max(REVIEW_COMMENT_MAX, `At most ${REVIEW_COMMENT_MAX} characters`),
});
export type ReviewFormValues = z.infer<typeof reviewSchema>;

export const replySchema = z.object({
  reply: z.string().trim().min(1, 'Write a reply').max(REVIEW_COMMENT_MAX, `At most ${REVIEW_COMMENT_MAX} characters`),
});
export type ReplyFormValues = z.infer<typeof replySchema>;

/** Form values -> request body (an empty comment is omitted). */
export function toReviewPayload(v: ReviewFormValues): { rating: number; comment?: string } {
  return v.comment ? { rating: v.rating, comment: v.comment } : { rating: v.rating };
}
