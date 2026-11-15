import { api } from '@/lib/api-client';
import type { QuestionDTO } from './questions.types';

export async function fetchQuestions(auctionId: string): Promise<QuestionDTO[]> {
  const res = await api.get(`/auctions/${encodeURIComponent(auctionId)}/questions`);
  const items = res.data?.data?.items;
  return Array.isArray(items) ? (items as QuestionDTO[]) : [];
}

export async function askQuestion(auctionId: string, question: string): Promise<QuestionDTO> {
  const res = await api.post(`/auctions/${encodeURIComponent(auctionId)}/questions`, { question });
  return res.data.data.question as QuestionDTO;
}

export async function answerQuestion(id: string, answer: string): Promise<QuestionDTO> {
  const res = await api.post(`/questions/${encodeURIComponent(id)}/answer`, { answer });
  return res.data.data.question as QuestionDTO;
}

export async function hideQuestion(id: string): Promise<void> {
  await api.post(`/questions/${encodeURIComponent(id)}/hide`);
}
