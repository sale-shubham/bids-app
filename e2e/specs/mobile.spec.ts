import { expect, test } from '@playwright/test';
import { createAuction } from '../lib/db.ts';
import { loadState, storageStatePath } from '../lib/run.ts';

// Pixel 7 viewport, signed in as bidder A (a MEMBER) (the `mobile` project in playwright.config.ts).
test.use({ storageState: storageStatePath('bidderA') });

const bottomNav = (page: import('@playwright/test').Page) => page.locator('nav.fixed');

// The bottom nav is part of the shell everywhere: the member pages and the public pages (guest mode).
test('bottom nav shows the member tabs (Auctions, My bids, My auctions, Profile) and navigates', async ({ page }) => {
  await page.goto('/watchlist');
  const nav = bottomNav(page);
  await expect(nav).toBeVisible();
  for (const name of ['Auctions', 'My bids', 'My auctions', 'Profile']) {
    await expect(nav.getByRole('link', { name })).toBeVisible();
  }
  await nav.getByRole('link', { name: 'My bids' }).click();
  await expect(page).toHaveURL(/\/my-bids$/);
  await nav.getByRole('link', { name: 'My auctions' }).click();
  await expect(page).toHaveURL(/\/sell\/auctions$/);
  await nav.getByRole('link', { name: 'Profile' }).click();
  await expect(page).toHaveURL(/\/profile$/);
});

test.describe('guest', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('guest bottom nav on a public page: Auctions, Leaderboard, Log in', async ({ page }) => {
    await page.goto('/auctions');
    const nav = bottomNav(page);
    await expect(nav).toBeVisible();
    for (const name of ['Auctions', 'Leaderboard', 'Log in']) {
      await expect(nav.getByRole('link', { name })).toBeVisible();
    }
    await expect(nav.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login?next=%2Fauctions');
  });
});

test('phone layout: bottom nav is shown and the page does not scroll sideways', async ({ page }) => {
  await page.goto('/watchlist');
  await expect(bottomNav(page)).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1); // no horizontal page scroll
});

test('bid panel is usable: quick amounts, custom bid, confirm, success', async ({ page }) => {
  const { runId, members } = loadState();
  const a = await createAuction({ sellerId: members.auctioneer.id, title: `E2E Mobile ${runId}`, startsInSec: -60, endsInSec: 2 * 3600 });
  await page.goto(`/auctions/${a.id}`);

  await expect(page.getByText('Starting bid')).toBeVisible();
  await expect(page.getByText(/Minimum next bid/)).toContainText('₹1,000');
  for (const label of ['+1×', '+2×', '+5×']) await expect(page.getByText(label)).toBeVisible();

  const input = page.getByLabel('Your maximum bid (₹)');
  await input.scrollIntoViewIfNeeded();
  await input.fill('1000');
  await page.getByRole('button', { name: 'Place bid' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Confirm your maximum bid')).toBeVisible();
  const confirm = dialog.getByRole('button', { name: 'Set max ₹1,000' });
  await expect(confirm).toBeInViewport();
  await confirm.click();

  await expect(page.getByText('Maximum bid of ₹1,000 placed')).toBeVisible();
  await expect(page.getByText("You're the highest bidder")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('auction cards stack in a grid that fits the screen', async ({ page }) => {
  const { runId, members } = loadState();
  await createAuction({ sellerId: members.auctioneer.id, title: `E2E MobileCard ${runId}`, startsInSec: -60, endsInSec: 3600 });
  await page.goto(`/auctions?q=${encodeURIComponent(`E2E MobileCard ${runId}`)}`);
  const card = page.getByRole('link', { name: /E2E MobileCard/ }).first();
  await expect(card).toBeVisible();
  const box = await card.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
});
