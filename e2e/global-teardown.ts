import { sweep } from './lib/db.ts';
import { loadState } from './lib/run.ts';

// Deletes everything this run created, found by the run id in the member email:
// members (and with them sessions, payment orders, push subscriptions), their
// auctions, bids, commissions, notifications, watchlist rows and OTP challenges.
// This includes members that specs created through the signup form.
export default async function globalTeardown() {
  let runId: string;
  try {
    runId = loadState().runId;
  } catch {
    return; // setup never got far enough to create anything
  }
  const swept = await sweep({ runId });
  console.log(`[e2e] cleaned run ${runId}: ${JSON.stringify(swept)}`);
}
