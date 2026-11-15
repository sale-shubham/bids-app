import { expect, test } from '@playwright/test';
import { createAuction } from '../lib/db.ts';
import { loadState } from '../lib/run.ts';

// Public (logged-out) pages, rendered in the app shell's guest mode. Auctions are seeded straight into the DB under the run's auctioneer.

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

test('the root "/" is only a redirect to /login for guests (marketing lives on the website)', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
});

test('public pages render in the app shell in guest mode', async ({ page }) => {
  await page.goto('/auctions');
  // Guest nav (sidebar on desktop): Auctions + Leaderboard only.
  const sidebar = page.locator('aside');
  await expect(sidebar.getByRole('link', { name: 'Auctions' })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'Leaderboard' })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'Watchlist' })).toHaveCount(0);
  // Header: Log in / Sign up carry ?next= back to this page instead of a user menu.
  await expect(page.getByRole('link', { name: 'Log in', exact: true })).toHaveAttribute('href', '/login?next=%2Fauctions');
  await expect(page.getByRole('link', { name: 'Sign up', exact: true })).toHaveAttribute('href', '/signup?next=%2Fauctions');
  // Footer links point at the separate website as absolute links.
  for (const [name, path] of [['About', '/about'], ['How it works', '/how-it-works'], ['Contact', '/contact']] as const) {
    await expect(page.getByRole('link', { name, exact: true }).last()).toHaveAttribute('href', new RegExp(`^https?://.+${path}$`));
  }
});

test('the leaderboard and legal pages are public too', async ({ page }) => {
  await page.goto('/leaderboard');
  await expect(page.getByRole('heading', { name: 'Leaderboard', level: 1 })).toBeVisible();
  await page.goto('/pages/privacy-policy');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('marketing pages are no longer served by the app', async ({ page }) => {
  for (const p of ['/about', '/how-it-works', '/contact']) {
    const res = await page.goto(p);
    expect(res?.status()).toBe(404);
  }
});

test('browse: search filter syncs to the URL and finds the seeded auction', async ({ page }) => {
  await page.goto('/auctions');
  await expect(page.getByRole('heading', { name: 'Auctions', level: 1 })).toBeVisible();
  // Typing before React hydrates is dropped by the controlled input, so retry the fill until the URL syncs.
  await expect(async () => {
    await page.getByLabel('Search auctions').fill(live.title);
    await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent(live.title).replace(/%20/g, '(?:\\+|%20)')}`), { timeout: 3000 });
  }).toPass({ timeout: 20_000 });
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
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/login\?next=%2Fprofile/);
});
