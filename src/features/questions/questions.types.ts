export interface QuestionDTO {
  id: string;
  auctionId: string;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
  /** Masked asker label, e.g. "R***h". */
  askerLabel: string;
  /** The signed-in viewer asked this one (they can see it while unanswered). */
  isMine: boolean;
}
