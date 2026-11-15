import { z } from '@/lib/zod';

export const questionSchema = z.object({
  question: z.string().trim().min(5, 'At least 5 characters').max(500, 'At most 500 characters'),
});
export type QuestionFormValues = z.infer<typeof questionSchema>;

export const answerSchema = z.object({
  answer: z.string().trim().min(1, 'Write an answer').max(1000, 'At most 1000 characters'),
});
export type AnswerFormValues = z.infer<typeof answerSchema>;
