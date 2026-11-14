import { expect, test } from '@playwright/test';
import { createAuction } from '../lib/db.ts';
import { loadState } from '../lib/run.ts';

// Public (logged-out) pages. Auctions are seeded straight into the DB under the run's auctioneer.

const HOUR = 3600;
let seller: string;
let live: { id: string; title: string };
let upcoming: { id: string; title: string };

test.beforeAll(async () => {
  const { runId, members } = loadState();
  seller = members.auctioneer.id;
  live = await createAuction({ sellerId: seller, title: `E2E Live Lamp ${runId}`, startsInSec: -60, endsInSec: 2 * HOUR });
  upcoming = await createAuction({ sellerId: seller, title: `E2E Upcoming Clock ${runId}`, startsInSec: HOUR, endsInSec: 3 * HOUR });
});

test('home shows the hero and how-it-works, and links to browse', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/NobleBid/);
  await expect(page.getByRole('heading', { name: 'Bid. Win. Sell.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'How it works' })).toBeVisible();
  await page.getByRole('link', { name: 'Browse auctions' }).first().click();
  await expect(page).toHaveURL(/\/auctions$/);
});

test('home lists any non-empty auction sections with a "View all" link', async ({ page }) => {
  await page.goto('/');
  // Sections render only when they have items; whichever ones exist must be well formed.
  for (const name of ['Featured', 'Ending soon', 'Upcoming']) {
    const section = page.getByRole('region', { name });
    if (await section.count()) {
      await expect(section.getByRole('link', { name: 'View all' })).toBeVisible();
      await expect(section.getByRole('link').first()).toBeVisible();
    }
  }
});

test('browse: search filter syncs to the URL and finds the seeded auction', async ({ page }) => {
  await page.goto('/auctions');
  await expect(page.getByRole('heading', { name: 'Auctions', level: 1 })).toBeVisible();
  await page.getByLabel('Search auctions').fill(live.title);
  await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent(live.title).replace(/%20/g, '(?:\\+|%20)')}`));
  await expect(page.getByRole('link', { name: new RegExp(live.title) }).first()).toBeVisible();
});

test('browse: status tabs sync to the URL and show the matching auctions', async ({ page }) => {
  await page.goto(`/auctions?q=${encodeURIComponent(upcoming.title)}`);
  await expect(page.getByText('No auctions found')).toBeVisible(); // it is not live yet
  await page.getByRole('tab', { name: 'Upcoming' }).click();
  await expect(page).toHaveURL(/status=upcoming/);
  await expect(page.getByRole('link', { name: new RegExp(upcoming.title) }).first()).toBeVisible();
});

test('browse: a URL with filters restores them on load', async ({ page }) => {
  await page.goto(`/auctions?status=upcoming&q=${encodeURIComponent(upcoming.title)}&sort=newest`);
  await expect(page.getByRole('tab', { name: 'Upcoming' })).toHaveAttribute('data-state', 'active');
  await expect(page.getByLabel('Search auctions')).toHaveValue(upcoming.title);
  await expect(page.getByRole('link', { name: new RegExp(upcoming.title) }).first()).toBeVisible();
});

test('auction detail has an SEO title, canonical link and the item heading', async ({ page }) => {
  await page.goto(`/auctions/${live.id}`);
  await expect(page).toHaveTitle(`${live.title} — NobleBid`);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`/auctions/${live.id}$`));
  await expect(page.getByRole('heading', { name: live.title, level: 1 })).toBeVisible();
  // Guests are invited to log in, returning to this auction afterwards.
  const login = page.getByRole('link', { name: 'Log in to bid' });
  await expect(login).toHaveAttribute('href', `/login?next=${encodeURIComponent(`/auctions/${live.id}`)}`);
});

test('protected areas bounce guests to login with a next param', async ({ page }) => {
  await page.goto('/watchlist');
  await expect(page).toHaveURL(/\/login\?next=%2Fwatchlist/);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login/);
});
