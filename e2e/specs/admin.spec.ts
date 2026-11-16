import { expect, test } from '@playwright/test';
import { createMember, memberByEmail } from '../lib/db.ts';
import { loadState, storageStatePath, testEmail } from '../lib/run.ts';

// Runs as the run's SUPER_ADMIN (storage state from global setup).
test.use({ storageState: storageStatePath('admin') });

test('dashboard loads its stat cards and navigation', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Admin dashboard' })).toBeVisible();
  for (const label of ['Members', 'Live auctions', 'Bids today', 'Commission paid', 'Commission due']) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  }
  // The sidebar lists every admin page (the old "Admin sections" strip is gone).
  const sidebar = page.locator('aside');
  for (const name of ['Dashboard', 'Members', 'Auctions', 'Commissions', 'Payments', 'Settings', 'Profile']) {
    await expect(sidebar.getByRole('link', { name, exact: true })).toBeVisible();
  }
});

test('deactivate and reactivate a member', async ({ page }) => {
  const email = testEmail(loadState().runId, 'toggle');
  await createMember({ email, name: 'E2E Toggle Member', role: 'MEMBER' });

  await page.goto('/admin/members');
  await page.getByPlaceholder('Search name or email').fill(email);
  await expect(page.getByText(email).first()).toBeVisible();

  await expect(page.getByRole('row')).toHaveCount(2); // header + the one match
  await page.getByRole('button', { name: 'Deactivate', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Deactivate' }).click();
  await expect(page.getByText('Member deactivated')).toBeVisible();
  await expect.poll(async () => (await memberByEmail(email)).isActive).toBe(false);

  await page.getByRole('button', { name: 'Activate', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Activate' }).click();
  await expect(page.getByText('Member activated')).toBeVisible();
  await expect.poll(async () => (await memberByEmail(email)).isActive).toBe(true);
});

test('an admin cannot deactivate their own account', async ({ page }) => {
  await page.goto('/admin/members');
  await page.getByPlaceholder('Search name or email').fill(loadState().members.admin.email);
  await expect(page.getByRole('row')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Deactivate', exact: true })).toBeDisabled();
});

test('settings: marketplace and legal tabs', async ({ page }) => {
  await page.goto('/admin/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Marketplace' })).toHaveAttribute('data-state', 'active');
  await expect(page.getByRole('button', { name: 'Save settings' })).toBeVisible();
  await expect(page.getByLabel('New category')).toBeVisible();

  await page.getByRole('tab', { name: 'Legal pages' }).click();
  await expect(page).toHaveURL(/tab=legal/);
  await expect(page.getByRole('tab', { name: 'Legal pages' })).toHaveAttribute('data-state', 'active');
});

test('SUPER_ADMIN is kept to /admin: member routes redirect to /admin', async ({ page }) => {
  for (const path of ['/', '/sell/auctions', '/my-bids', '/watchlist', '/profile', '/notifications']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/admin$/);
  }
});

test('SUPER_ADMIN can still browse the public pages (in the admin shell)', async ({ page }) => {
  await page.goto('/auctions');
  await expect(page.getByRole('heading', { name: 'Auctions', level: 1 })).toBeVisible();
  await expect(page.locator('aside').getByRole('link', { name: 'Members' })).toBeVisible();
});

test('admin profile page shows the account and security tabs', async ({ page }) => {
  await page.goto('/admin/profile');
  await expect(page.getByRole('heading', { name: 'Profile', level: 1 })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Security' })).toBeVisible();
});
