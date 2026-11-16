import { expect, test } from '@playwright/test';
import { createAuction } from '../lib/db.ts';
import { loadState, storageStatePath } from '../lib/run.ts';

// Runs as the run's seller persona (a MEMBER) (storage state from global setup).
test.use({ storageState: storageStatePath('auctioneer') });

const HOUR = 3600;
const sellerId = () => loadState().members.auctioneer.id;
const unique = (label: string) => `E2E ${label} ${loadState().runId}`;

test('my auctions lists a seeded live auction with its actions', async ({ page }) => {
  const a = await createAuction({ sellerId: sellerId(), title: unique('Mine'), startsInSec: -60, endsInSec: 2 * HOUR });
  await page.goto('/sell/auctions');
  await expect(page.getByRole('heading', { name: 'My auctions' })).toBeVisible();
  const row = page.getByRole('listitem').filter({ hasText: a.title });
  await expect(row).toBeVisible();
  await expect(row.getByText('Live', { exact: true })).toBeVisible();
  await row.getByRole('button', { name: /^Actions for / }).click();
  await expect(page.getByRole('menuitem', { name: 'Edit' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Bids' })).toHaveAttribute('href', `/sell/auctions/${a.id}`);
});

test('edit an auction with 0 bids', async ({ page }) => {
  const a = await createAuction({ sellerId: sellerId(), title: unique('Edit me'), startsInSec: HOUR, endsInSec: HOUR + 24 * HOUR });
  const newTitle = unique('Edited');
  await page.goto(`/sell/auctions/${a.id}/edit`);
  const title = page.getByLabel('Title');
  await expect(title).toHaveValue(a.title);
  await title.fill(newTitle);
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Auction updated')).toBeVisible();

  await page.goto('/sell/auctions');
  await page.getByRole('tab', { name: 'Upcoming' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: newTitle })).toBeVisible();
});

test('delete an auction with 0 bids (confirm dialog)', async ({ page }) => {
  const a = await createAuction({ sellerId: sellerId(), title: unique('Delete me'), startsInSec: HOUR, endsInSec: 2 * HOUR });
  await page.goto('/sell/auctions');
  await page.getByRole('tab', { name: 'Upcoming' }).click();
  const row = page.getByRole('listitem').filter({ hasText: a.title });
  await row.getByRole('button', { name: /^Actions for / }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Delete this auction?')).toBeVisible();
  await dialog.getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByText('Auction deleted')).toBeVisible();
  await expect(row).toHaveCount(0);
});

test('create form shows validation errors for an empty submit', async ({ page }) => {
  await page.goto('/sell/new');
  const submit = page.getByRole('button', { name: 'Create auction' });
  test.skip(await submit.isDisabled(), 'Create is blocked by unpaid commission for this seller; pay it first');
  await submit.click();
  await expect(page.getByText('At least 5 characters')).toBeVisible();
  await expect(page.getByText('Add at least one image')).toBeVisible();
  await expect(page.getByText('Starting bid is required')).toBeVisible();
  await expect(page.getByText('Choose a category').first()).toBeVisible();
});

test('create form flags a short title and a sub-rupee starting bid', async ({ page }) => {
  await page.goto('/sell/new');
  await page.getByLabel('Title').fill('abc');
  await page.getByLabel('Starting bid (₹)').fill('0.5');
  await page.getByRole('button', { name: 'Create auction' }).click();
  await expect(page.getByText('At least 5 characters')).toBeVisible();
  await expect(page.getByText('Starting bid must be at least ₹1')).toBeVisible();
});

test('create an auction with a real image upload', async ({ page }) => {
  test.skip(!process.env.E2E_UPLOAD, 'Real image upload needs S3 credentials on the API; storage is unavailable in the plain local dev stack. Set E2E_UPLOAD=1 where it works.');
  await page.goto('/sell/new');
  await page.getByLabel('Title').fill(unique('Created'));
  await page.locator('.ql-editor').fill('A description that is comfortably longer than twenty characters.');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'e2e.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    ),
  });
  await page.getByLabel('Starting bid (₹)').fill('500');
  await page.getByRole('combobox', { name: /category/i }).first().click();
  await page.getByRole('option').first().click();
  await page.getByRole('button', { name: 'Create auction' }).click();
  await expect(page.getByText('Auction created')).toBeVisible();
});
