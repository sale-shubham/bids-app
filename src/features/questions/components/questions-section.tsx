'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useAuthStore } from '@/store/auth-store';
import { questionErrorMessage } from '../questions.errors';
import { answerSchema, questionSchema, type QuestionFormValues } from '../questions.schema';
import type { QuestionDTO } from '../questions.types';
import { useAnswerQuestion, useAskQuestion, useHideQuestion, useQuestions } from '../use-questions';

function AskForm({ auctionId }: { auctionId: string }) {
  const ask = useAskQuestion(auctionId);
  const form = useForm<QuestionFormValues>({ resolver: zodResolver(questionSchema), defaultValues: { question: '' } });
  const { errors } = form.formState;

  const onSubmit = (v: QuestionFormValues) =>
    ask.mutate(v.question, {
      onSuccess: () => {
        toast.success('Question sent. The seller will be notified.');
        form.reset({ question: '' });
      },
      onError: (e) => toast.error(questionErrorMessage(e, 'Could not send your question')),
    });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-2">
      <Textarea rows={3} maxLength={500} placeholder="Ask the seller a question" aria-label="Your question" aria-invalid={!!errors.question} {...form.register('question')} />
      {errors.question && <p className="text-xs text-destructive">{errors.question.message}</p>}
      <Button type="submit" size="sm" loading={ask.isPending}>
        Ask question
      </Button>
    </form>
  );
}

function AnswerForm({ auctionId, questionId }: { auctionId: string; questionId: string }) {
  const answer = useAnswerQuestion(auctionId);
  const [text, setText] = React.useState('');
  const [error, setError] = React.useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = answerSchema.safeParse({ answer: text });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid answer');
      return;
    }
    setError('');
    answer.mutate(
      { id: questionId, answer: parsed.data.answer },
      {
        onSuccess: () => toast.success('Answer posted'),
        onError: (err) => toast.error(questionErrorMessage(err, 'Could not post your answer')),
      },
    );
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-2">
      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={1000} placeholder="Write a public answer" aria-label="Your answer" aria-invalid={!!error} />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" size="sm" loading={answer.isPending}>
        Post answer
      </Button>
    </form>
  );
}

interface QuestionItemProps {
  q: QuestionDTO;
  auctionId: string;
  isSeller: boolean;
  onHide: (q: QuestionDTO) => void;
}

function QuestionItem({ q, auctionId, isSeller, onHide }: QuestionItemProps) {
  return (
    <li className="space-y-2 rounded-xl border p-4">
      <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{q.isMine ? `${q.askerLabel} (you)` : q.askerLabel}</span>
        <span>{formatDistanceToNow(new Date(q.createdAt), { addSuffix: true })}</span>
      </div>
      <p className="whitespace-pre-line wrap-break-word text-sm">{q.question}</p>
      {q.answer ? (
        <div className="rounded-lg bg-muted/60 p-3 text-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Seller answer{q.answeredAt ? ` · ${formatDistanceToNow(new Date(q.answeredAt), { addSuffix: true })}` : ''}
          </p>
          <p className="whitespace-pre-line wrap-break-word">{q.answer}</p>
        </div>
      ) : (
        <>
          {q.isMine && <p className="text-xs italic text-muted-foreground">Awaiting answer</p>}
          {isSeller && <AnswerForm auctionId={auctionId} questionId={q.id} />}
        </>
      )}
      {isSeller && (
        <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => onHide(q)}>
          Hide
        </Button>
      )}
    </li>
  );
}

interface QuestionsSectionProps {
  auctionId: string;
  sellerId: string;
  /** Auction ended or cancelled: no new questions. */
  ended: boolean;
}

/** Q&A under the description: public answered questions, the asker's own pending ones, the seller's inbox. */
export function QuestionsSection({ auctionId, sellerId, ended }: QuestionsSectionProps) {
  const member = useAuthStore((s) => s.member);
  const pathname = usePathname();
  const questions = useQuestions(auctionId);
  const hide = useHideQuestion(auctionId);
  const [target, setTarget] = React.useState<QuestionDTO | null>(null);

  const isSeller = !!member && member.id === sellerId;
  const canAsk = !!member && member.role === 'BIDDER' && !isSeller && !ended;
  const items = questions.data ?? [];

  const confirmHide = () => {
    if (!target) return;
    hide.mutate(target.id, {
      onSuccess: () => {
        toast.success('Question hidden');
        setTarget(null);
      },
      onError: (e) => {
        toast.error(questionErrorMessage(e, 'Could not hide the question'));
        setTarget(null);
      },
    });
  };

  return (
    <section className="space-y-3" aria-labelledby="questions">
      <h2 id="questions" className="text-lg font-semibold">
        Questions
      </h2>

      {questions.isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : questions.isError ? (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{questionErrorMessage(questions.error, 'Could not load questions')}</span>
          <Button variant="outline" size="sm" onClick={() => void questions.refetch()}>
            Try again
          </Button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No questions yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((q) => (
            <QuestionItem key={q.id} q={q} auctionId={auctionId} isSeller={isSeller} onHide={setTarget} />
          ))}
        </ul>
      )}

      {canAsk && <AskForm auctionId={auctionId} />}
      {!member && !ended && (
        <Button asChild variant="outline" size="sm">
          <Link href={`/login?next=${encodeURIComponent(pathname)}`}>Log in to ask</Link>
        </Button>
      )}

      <ConfirmDialog
        open={!!target}
        onOpenChange={(o) => !o && setTarget(null)}
        title="Hide this question?"
        description="It will no longer be shown to anyone on this auction."
        confirmLabel="Hide"
        variant="destructive"
        loading={hide.isPending}
        onConfirm={confirmHide}
      />
    </section>
  );
}
