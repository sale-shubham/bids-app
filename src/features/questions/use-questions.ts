'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import * as api from './questions.api';

export const questionsKey = (auctionId: string) => ['questions', auctionId] as const;

/** Questions visible to the viewer (the server filters by role). Refetches on login change. */
export function useQuestions(auctionId: string) {
  const viewerId = useAuthStore((s) => s.member?.id ?? null);
  return useQuery({
    queryKey: [...questionsKey(auctionId), viewerId],
    queryFn: () => api.fetchQuestions(auctionId),
  });
}

function useInvalidate(auctionId: string) {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: questionsKey(auctionId) });
}

export function useAskQuestion(auctionId: string) {
  const invalidate = useInvalidate(auctionId);
  return useMutation({ mutationFn: (question: string) => api.askQuestion(auctionId, question), onSuccess: invalidate });
}

export function useAnswerQuestion(auctionId: string) {
  const invalidate = useInvalidate(auctionId);
  return useMutation({
    mutationFn: ({ id, answer }: { id: string; answer: string }) => api.answerQuestion(id, answer),
    onSuccess: invalidate,
  });
}

export function useHideQuestion(auctionId: string) {
  const invalidate = useInvalidate(auctionId);
  return useMutation({ mutationFn: (id: string) => api.hideQuestion(id), onSuccess: invalidate });
}
