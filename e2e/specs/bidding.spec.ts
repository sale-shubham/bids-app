import { expect, test, type Browser, type Page } from '@playwright/test';
import { api, apiContext, placeBid } from '../lib/api.ts';
import { createAuction } from '../lib/db.ts';
import { IMAGE_URL } from '../lib/env.ts';
import { loadState, storageStatePath, type TestRole } from '../lib/run.ts';

// Two browser contexts, two bidders, one live auction. Live updates arrive over the
// WebSocket (ws://localhost:4000/ws) or, if it is down, the 10 s polling fallback; the
// timeouts below cover both.

const HOUR = 3600;
const LIVE = { timeout: 25_000 };

/** Open the page and wait until its live socket has subscribed to the auction room: events sent
 *  before that are not replayed, so bidding earlier would race the other page's subscription. */
async function openAs(browser: Browser, who: TestRole, path: string): Promise<Page> {
  const ctx = await browser.newContext({ storageState: storageStatePath(who) });
  const page = await ctx.newPage();
  const subscribed = new Promise<void>((resolve) => {
    page.on('websocket', (ws) => {
      if (ws.url().includes('/_next/')) return;
      ws.on('framesent', (f) => {
        if (String(f.payload).includes('"subscribe"')) resolve();
      });
    });
  });
  await page.goto(path);
  await subscribed;
  return page;
}

async function bid(page: Page, rupees: number) {
  await page.getByLabel('Your maximum bid (₹)').fill(String(rupees));
  await page.getByRole('button', { name: 'Place bid' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^Set max ₹/ }).click();
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
  await expect(a.getByText('Maximum bid of ₹1,000 placed')).toBeVisible();
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
  await expect(a.getByLabel('Your maximum bid (₹)')).toBeVisible();

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
  await a.getByLabel('Your maximum bid (₹)').fill('1000');
  await a.getByRole('button', { name: 'Place bid' }).click();
  const dialog = a.getByRole('dialog');
  await expect(dialog.getByText('Confirm your maximum bid')).toBeVisible();

  // ... but B's ₹1,000 lands first (through the API).
  const bCtx = await apiContext(storageStatePath('bidderB'));
  await placeBid(bCtx, auction.id, 100000);
  await bCtx.dispose();

  await dialog.getByRole('button', { name: 'Set max ₹1,000' }).click();
  await expect(a.getByText('Someone bid before you. The minimum bid is now ₹1,100.')).toBeVisible();
  // The panel refetched and now asks for at least ₹1,100.
  await expect(a.getByText(/Minimum next bid/)).toContainText('₹1,100', LIVE);

  await a.context().close();
});

test('client-side validation: too low and non-whole amounts never reach the server', async ({ browser }) => {
  const { runId, members } = loadState();
  const auction = await createAuction({ sellerId: members.auctioneer.id, title: `E2E Validate ${runId}`, startsInSec: -60, endsInSec: 2 * HOUR });
  const a = await openAs(browser, 'bidderA', `/auctions/${auction.id}`);

  await a.getByLabel('Your maximum bid (₹)').fill('500');
  await a.getByRole('button', { name: 'Place bid' }).click();
  await expect(a.getByRole('alert').filter({ hasText: 'Bid at least ₹1,000.' })).toBeVisible();

  await a.getByLabel('Your maximum bid (₹)').fill('1000.50');
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
  await expect(s.getByLabel('Your maximum bid (₹)')).toHaveCount(0);
  await s.context().close();
});

test('proxy bidding: a lower max is outbid by the leader max, and the reserve badge shows', async ({ browser }) => {
  const { runId } = loadState();
  // Create through the API as the seller so the reserve column names are the API's business, not ours.
  const sellerCtx = await apiContext(storageStatePath('auctioneer'));
  const now = Date.now();
  const created = await api.post<{ id: string; title: string }>(sellerCtx, '/auctions', {
    title: `E2E Proxy ${runId}`,
    description: '<p>Created by the NobleBid e2e suite. Safe to delete.</p>',
    category: 'Antiques',
    condition: 'USED',
    images: [IMAGE_URL],
    startingBidPaise: 100000,
    minIncrementPaise: 10000,
    reservePricePaise: 500000,
    startTime: new Date(now).toISOString(),
    endTime: new Date(now + 2 * HOUR * 1000).toISOString(),
  });
  await sellerCtx.dispose();
  const path = `/auctions/${created.id}`;
  const a = await openAs(browser, 'bidderA', path);
  const b = await openAs(browser, 'bidderB', path);

  // Reserve badge is visible to bidders, the reserve amount is not.
  await expect(a.getByText('Reserve not met')).toBeVisible();
  await expect(a.getByText('₹5,000')).toHaveCount(0);

  // A sets a max of 1,500: the price only moves to the opening bid.
  await bid(a, 1500);
  await expect(a.getByText("You're the highest bidder")).toContainText('your max ₹1,500');

  // B bids a max of 1,200: A's proxy answers at 1,300, so B is told to raise the maximum and the form stays.
  await expect(b.getByText('Current bid')).toBeVisible(LIVE);
  await bid(b, 1200);
  await expect(b.getByText("Another bidder's maximum is higher. Try a higher maximum.")).toBeVisible();
  await expect(b.getByLabel('Your maximum bid (₹)')).toBeVisible();
  await expect(b.getByText('Current bid').locator('xpath=following-sibling::*[1]')).toContainText('₹1,300', LIVE);

  // A is still the leader, with an unchanged max.
  await expect(a.getByText("You're the highest bidder")).toContainText('your max ₹1,500', LIVE);

  await a.context().close();
  await b.context().close();
});
