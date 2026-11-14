import { expect, test, type Browser, type Page } from '@playwright/test';
import { apiContext, placeBid } from '../lib/api.ts';
import { createAuction } from '../lib/db.ts';
import { loadState, storageStatePath, type TestRole } from '../lib/run.ts';

// Two browser contexts, two bidders, one live auction. Live updates arrive over the
// WebSocket (ws://localhost:4000/ws) or, if it is down, the 10 s polling fallback; the
// timeouts below cover both.

const HOUR = 3600;
const LIVE = { timeout: 25_000 };

async function openAs(browser: Browser, who: TestRole, path: string): Promise<Page> {
  const ctx = await browser.newContext({ storageState: storageStatePath(who) });
  const page = await ctx.newPage();
  await page.goto(path);
  return page;
}

async function bid(page: Page, rupees: number) {
  await page.getByLabel('Your bid (₹)').fill(String(rupees));
  await page.getByRole('button', { name: 'Place bid' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^Bid ₹/ }).click();
}

test('bidder A bids, B sees it live, B outbids, A is told', async ({ browser }) => {
  const { runId, members } = loadState();
  const auction = await createAuction({
    sellerId: members.auctioneer.id,
    title: `E2E Bidding ${runId}`,
    startsInSec: -60,
    endsInSec: 2 * HOUR,
    startingBidPaise: 100000,
    minIncrementPaise: 10000,
  });
  const path = `/auctions/${auction.id}`;
  const a = await openAs(browser, 'bidderA', path);
  const b = await openAs(browser, 'bidderB', path);

  await expect(a.getByText('Starting bid')).toBeVisible();
  await expect(a.getByText(/Minimum next bid/)).toContainText('₹1,000');

  // A places the opening bid.
  await bid(a, 1000);
  await expect(a.getByText('Bid of ₹1,000 placed')).toBeVisible();
  await expect(a.getByText("You're the highest bidder")).toBeVisible();

  // B sees the new price, count and minimum without reloading.
  await expect(b.getByText('Current bid')).toBeVisible(LIVE);
  await expect(b.getByText('1 bid', { exact: true })).toBeVisible(LIVE);
  await expect(b.getByText(/Minimum next bid/)).toContainText('₹1,100');

  // B outbids; A gets the outbid toast and the controls come back.
  await bid(b, 1100);
  await expect(b.getByText("You're the highest bidder")).toBeVisible();
  await expect(a.getByText(`You've been outbid on ${auction.title}`)).toBeVisible(LIVE);
  await expect(a.getByText('Outbid', { exact: true })).toBeVisible();
  await expect(a.getByLabel('Your bid (₹)')).toBeVisible();

  await a.context().close();
  await b.context().close();
});

test('a bid that loses the race is rejected with the new minimum (BID_TOO_LOW)', async ({ browser }) => {
  const { runId, members } = loadState();
  const auction = await createAuction({
    sellerId: members.auctioneer.id,
    title: `E2E Race ${runId}`,
    startsInSec: -60,
    endsInSec: 2 * HOUR,
    startingBidPaise: 100000,
    minIncrementPaise: 10000,
  });
  const a = await openAs(browser, 'bidderA', `/auctions/${auction.id}`);

  // A opens the confirm dialog for ₹1,000 ...
  await a.getByLabel('Your bid (₹)').fill('1000');
  await a.getByRole('button', { name: 'Place bid' }).click();
  const dialog = a.getByRole('dialog');
  await expect(dialog.getByText('Confirm your bid')).toBeVisible();

  // ... but B's ₹1,000 lands first (through the API).
  const bCtx = await apiContext(storageStatePath('bidderB'));
  await placeBid(bCtx, auction.id, 100000);
  await bCtx.dispose();

  await dialog.getByRole('button', { name: 'Bid ₹1,000' }).click();
  await expect(a.getByText('Someone bid before you. The minimum bid is now ₹1,100.')).toBeVisible();
  // The panel refetched and now asks for at least ₹1,100.
  await expect(a.getByText(/Minimum next bid/)).toContainText('₹1,100', LIVE);

  await a.context().close();
});

test('client-side validation: too low and non-whole amounts never reach the server', async ({ browser }) => {
  const { runId, members } = loadState();
  const auction = await createAuction({ sellerId: members.auctioneer.id, title: `E2E Validate ${runId}`, startsInSec: -60, endsInSec: 2 * HOUR });
  const a = await openAs(browser, 'bidderA', `/auctions/${auction.id}`);

  await a.getByLabel('Your bid (₹)').fill('500');
  await a.getByRole('button', { name: 'Place bid' }).click();
  await expect(a.getByRole('alert').filter({ hasText: 'Bid at least ₹1,000.' })).toBeVisible();

  await a.getByLabel('Your bid (₹)').fill('1000.50');
  await a.getByRole('button', { name: 'Place bid' }).click();
  await expect(a.getByRole('alert').filter({ hasText: 'Enter a whole rupee amount.' })).toBeVisible();
  await expect(a.getByRole('dialog')).toHaveCount(0);

  await a.context().close();
});

test('the seller sees a note instead of bid controls on their own auction', async ({ browser }) => {
  const { runId, members } = loadState();
  const auction = await createAuction({ sellerId: members.auctioneer.id, title: `E2E Own ${runId}`, startsInSec: -60, endsInSec: 2 * HOUR });
  const s = await openAs(browser, 'auctioneer', `/auctions/${auction.id}`);
  await expect(s.getByText(/This is your auction/)).toBeVisible();
  await expect(s.getByLabel('Your bid (₹)')).toHaveCount(0);
  await s.context().close();
});
