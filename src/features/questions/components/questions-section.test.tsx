import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore, type AuthMember } from '@/store/auth-store';
import * as api from '../questions.api';
import type { QuestionDTO } from '../questions.types';
import { QuestionsSection } from './questions-section';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('next/navigation', () => ({ usePathname: () => '/auctions/a1' }));
vi.mock('../questions.api');

const q = (over: Partial<QuestionDTO> = {}): QuestionDTO => ({
  id: 'q1',
  auctionId: 'a1',
  question: 'Is it genuine brass?',
  answer: null,
  answeredAt: null,
  createdAt: new Date().toISOString(),
  askerLabel: 'R***h',
  isMine: false,
  ...over,
});
const signIn = (id: string | null, role: AuthMember['role'] = 'BIDDER') =>
  useAuthStore.setState({ member: id ? ({ id, role } as AuthMember) : null, initialized: true });

function renderSection(ended = false) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <QuestionsSection auctionId="a1" sellerId="seller1" ended={ended} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  signIn(null);
  vi.mocked(api.fetchQuestions).mockResolvedValue([]);
});

describe('QuestionsSection visibility', () => {
  it('guest: sees answered questions and a Log in to ask link, no form', async () => {
    vi.mocked(api.fetchQuestions).mockResolvedValue([q({ answer: 'Yes, solid brass', answeredAt: new Date().toISOString() })]);
    renderSection();
    expect(await screen.findByText('Yes, solid brass')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Log in to ask' })).toHaveAttribute('href', '/login?next=%2Fauctions%2Fa1');
    expect(screen.queryByLabelText('Your question')).not.toBeInTheDocument();
  });

  it('bidder: own pending question shows "Awaiting answer"; ask form visible', async () => {
    signIn('u1');
    vi.mocked(api.fetchQuestions).mockResolvedValue([q({ isMine: true })]);
    renderSection();
    expect(await screen.findByText('Awaiting answer')).toBeInTheDocument();
    expect(screen.getByLabelText('Your question')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hide' })).not.toBeInTheDocument();
  });

  it('ended auction: no ask form and no login link', async () => {
    signIn('u1');
    renderSection(true);
    await screen.findByText('No questions yet.');
    expect(screen.queryByLabelText('Your question')).not.toBeInTheDocument();
  });

  it('the seller cannot ask but can answer and hide', async () => {
    signIn('seller1', 'AUCTIONEER');
    vi.mocked(api.fetchQuestions).mockResolvedValue([q()]);
    renderSection();
    expect(await screen.findByLabelText('Your answer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Your question')).not.toBeInTheDocument();
  });
});

describe('SUPER_ADMIN viewer', () => {
  it('sees Hide (also on pending questions) but cannot ask or answer', async () => {
    signIn('adm', 'SUPER_ADMIN');
    vi.mocked(api.fetchQuestions).mockResolvedValue([q()]);
    renderSection();
    expect(await screen.findByRole('button', { name: 'Hide' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Your question')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Your answer')).not.toBeInTheDocument();
  });

  it('hiding as admin confirms, then calls the hide endpoint', async () => {
    signIn('adm', 'SUPER_ADMIN');
    vi.mocked(api.fetchQuestions).mockResolvedValue([q()]);
    vi.mocked(api.hideQuestion).mockResolvedValue(undefined);
    renderSection();
    await userEvent.click(await screen.findByRole('button', { name: 'Hide' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Hide' }));
    await waitFor(() => expect(api.hideQuestion).toHaveBeenCalledWith('q1'));
  });

  it('a bidder never sees Hide on someone else\'s question', async () => {
    signIn('u2', 'BIDDER');
    vi.mocked(api.fetchQuestions).mockResolvedValue([q({ answer: 'Yes', answeredAt: new Date().toISOString() })]);
    renderSection();
    await screen.findByText('Yes');
    expect(screen.queryByRole('button', { name: 'Hide' })).not.toBeInTheDocument();
  });
});

describe('ask / answer / hide flows', () => {
  it('asking posts the question and clears the box', async () => {
    signIn('u1');
    vi.mocked(api.askQuestion).mockResolvedValue(q({ isMine: true }));
    renderSection();
    const box = await screen.findByLabelText('Your question');
    await userEvent.type(box, 'Does it ship?');
    await userEvent.click(screen.getByRole('button', { name: 'Ask question' }));
    await waitFor(() => expect(api.askQuestion).toHaveBeenCalledWith('a1', 'Does it ship?'));
    await waitFor(() => expect(box).toHaveValue(''));
  });

  it('too-short question is rejected client-side', async () => {
    signIn('u1');
    renderSection();
    await userEvent.type(await screen.findByLabelText('Your question'), 'Hi');
    await userEvent.click(screen.getByRole('button', { name: 'Ask question' }));
    expect(await screen.findByText('At least 5 characters')).toBeInTheDocument();
    expect(api.askQuestion).not.toHaveBeenCalled();
  });

  it('seller answers', async () => {
    signIn('seller1', 'AUCTIONEER');
    vi.mocked(api.fetchQuestions).mockResolvedValue([q()]);
    vi.mocked(api.answerQuestion).mockResolvedValue(q({ answer: 'Yes' }));
    renderSection();
    await userEvent.type(await screen.findByLabelText('Your answer'), 'Yes');
    await userEvent.click(screen.getByRole('button', { name: 'Post answer' }));
    await waitFor(() => expect(api.answerQuestion).toHaveBeenCalledWith('q1', 'Yes'));
  });

  it('hide goes through a confirm dialog', async () => {
    signIn('seller1', 'AUCTIONEER');
    vi.mocked(api.fetchQuestions).mockResolvedValue([q()]);
    vi.mocked(api.hideQuestion).mockResolvedValue();
    renderSection();
    await userEvent.click(await screen.findByRole('button', { name: 'Hide' }));
    expect(api.hideQuestion).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Hide' }));
    await waitFor(() => expect(api.hideQuestion).toHaveBeenCalledWith('q1'));
  });
});
