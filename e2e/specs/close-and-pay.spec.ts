import { expect, test } from '@playwright/test';
import { auctionRow, commissionStatus, createAuction, createMember, seedBid } from '../lib/db.ts';
import { loadState, storageStatePath, testEmail } from '../lib/run.ts';
import { loginViaUi } from '../lib/ui.ts';

// The API's close job runs every 60 s locally, so an auction ending in ~75 s is closed
// between 75 and ~135 s from creation. The bid is written straight to the DB so the
// anti-sniping window (which would extend a last-minutes bid) cannot delay the close.
// A dedicated seller owns the auction, so its unpaid commission cannot block the
// run's main auctioneer from creating auctions in seller.spec.ts.

test.slow();
test.setTimeout(300_000);

const BID_PAISE = 100000; // ₹1,000 -> 5% commission = ₹50

test('auction closes, winner sees the result + contact, seller pays commission in test mode', async ({ browser, page }) => {
  const { runId, members } = loadState();
  const sellerEmail = testEmail(runId, 'seller2');
  const seller = await createMember({ email: sellerEmail, name: `E2E ${runId} Seller Two`, role: 'AUCTIONEER', phone: '+91 90000 00001' });
  const auction = await createAuction({
    sellerId: seller.id,
    title: `E2E Closing ${runId}`,
    startsInSec: -30,
    endsInSec: 75,
    startingBidPaise: BID_PAISE,
  });
  await seedBid(auction.id, members.bidderB.id, BID_PAISE);

  // 1. Wait for the close job: auction ENDED with bidder B as winner, commission created.
  await expect
    .poll(async () => (await auctionRow(auction.id))?.status, { timeout: 200_000, intervals: [5_000] })
    .toBe('ENDED');
  expect((await auctionRow(auction.id))?.winnerId).toBe(members.bidderB.id);
  await expect.poll(() => commissionStatus(auction.id), { timeout: 30_000 }).toBe('DUE');

  // 2. The winner sees the result and the seller's contact details.
  const winnerCtx = await browser.newContext({ storageState: storageStatePath('bidderB') });
  const winner = await winnerCtx.newPage();
  await winner.goto(`/auctions/${auction.id}`);
  await expect(winner.getByText('You won!')).toBeVisible();
  await expect(winner.getByText('Seller contact')).toBeVisible();
  await expect(winner.getByText(sellerEmail)).toBeVisible();
  await winnerCtx.close();

  // 3. The seller sees the winner's contact and pays the commission (stub gateway).
  await loginViaUi(page, sellerEmail);
  await expect(page).toHaveURL(/\/sell\/auctions$/);
  await page.goto(`/auctions/${auction.id}`);
  await expect(page.getByText('Winner contact')).toBeVisible();

  await page.goto('/sell/commissions');
  await expect(page.getByText('Total unpaid')).toBeVisible();
  await page.getByRole('button', { name: /^Pay ₹50$/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Test mode — simulate a successful payment?')).toBeVisible();
  await dialog.getByRole('button', { name: 'Simulate payment' }).click();
  await expect(page.getByText('Payment successful. Commission paid.')).toBeVisible();

  await page.getByRole('tab', { name: 'Paid' }).click();
  await expect(page.getByText('PAID', { exact: false }).first()).toBeVisible();
  expect(await commissionStatus(auction.id)).toBe('PAID');
});
