# Lot Q&A

Bidders ask the seller a public question on an auction; the seller answers (once) or hides it.

## API
- `GET /auctions/:id/questions` (guest allowed) -> `{ items }`. The server filters by viewer: the public sees answered questions, an asker also sees their own pending ones (`isMine`), the seller sees every pending one.
- `POST /auctions/:id/questions` `{ question: 5..500 }` (BIDDER, not the seller, auction not ended); errors `QUESTION_NOT_ALLOWED` (403), 429 rate limit (10/hour).
- `POST /questions/:id/answer` `{ answer: 1..1000 }`; error `ALREADY_ANSWERED` (409). `POST /questions/:id/hide` (seller or admin).

## Code (`src/features/questions/`)
- `questions.types.ts` (`QuestionDTO`), `questions.schema.ts` (`questionSchema`, `answerSchema`), `questions.errors.ts`, `questions.api.ts`, `use-questions.ts`.
- `useQuestions(auctionId)` key `['questions', auctionId, viewerId]` (viewer id so it refetches after login/logout); every mutation invalidates `['questions', auctionId]`.
- `QuestionsSection` sits under the description in `AuctionDetailView`: list (question, answer or "Awaiting answer" for the asker's own pending one, asker label, relative time). Ask form: signed-in BIDDER, not the seller, auction not ended/cancelled. Guests see a "Log in to ask" link (`/login?next=`). The seller gets an answer box per pending question and a "Hide" action behind `<ConfirmDialog>`.
- Notification types `question-asked` / `question-answered` use the generic inbox.
