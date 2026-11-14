import { expect, test, type Page } from '@playwright/test';
import { createMember, memberByEmail } from '../lib/db.ts';
import { PASSWORD, STUB_OTP } from '../lib/env.ts';
import { loadState, testEmail } from '../lib/run.ts';
import { fillOtp, loginViaUi } from '../lib/ui.ts';

// Every email OTP is 123456 on the local API (EMAIL_DRIVER=stub). Members made here
// carry the run id in their email, so global teardown deletes them.

const runId = () => loadState().runId;

async function fillSignup(page: Page, email: string) {
  await page.goto('/signup');
  await page.getByLabel('Full name').fill('E2E New Bidder');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password').fill(PASSWORD);
}

test('signup shows validation errors for an empty / weak form', async ({ page }) => {
  await page.goto('/signup');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Name is required')).toBeVisible();
  await expect(page.getByText('You must accept the Terms and Conditions to continue')).toBeVisible();
  await page.getByLabel('Password', { exact: true }).fill('short');
  await page.getByLabel('Confirm password').fill('different');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('At least 8 characters')).toBeVisible();
  await expect(page.getByText('Passwords do not match')).toBeVisible();
});

test('signup as a bidder with the stub OTP lands signed in on the auctions home', async ({ page }) => {
  const email = testEmail(runId(), 'signup-bidder');
  await fillSignup(page, email);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  await fillOtp(page, STUB_OTP);

  await expect(page).toHaveURL(/\/auctions$/);
  const row = await memberByEmail(email);
  expect(row).toMatchObject({ role: 'BIDDER', isActive: true });
  expect(row.emailVerifiedAt).not.toBeNull();
});

test('signup as an auctioneer lands in the seller area', async ({ page }) => {
  const email = testEmail(runId(), 'signup-seller');
  await fillSignup(page, email);
  await page.getByText('I want to sell').click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await fillOtp(page, STUB_OTP);
  await expect(page).toHaveURL(/\/sell\/auctions$/);
});

test('signup with an existing email shows a friendly error', async ({ page }) => {
  await fillSignup(page, loadState().members.bidderA.email);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('An account with this email already exists. Try logging in instead.').first()).toBeVisible();
});

test('login with email + password lands on the role home', async ({ page }) => {
  await loginViaUi(page, loadState().members.bidderA.email);
  await expect(page).toHaveURL(/\/auctions$/);
});

test('login honours a safe ?next= and rejects the wrong password', async ({ page }) => {
  const { bidderA } = loadState().members;
  await page.goto('/login');
  await page.getByLabel('Email').fill(bidderA.email);
  await page.getByLabel('Password', { exact: true }).fill('WrongPass999');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByText('Incorrect email or password.')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);

  await page.goto('/login?next=%2Fwatchlist');
  await page.getByLabel('Email').fill(bidderA.email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/watchlist$/);
});

test('forgot + reset password: code, new password, then log in with it', async ({ page }) => {
  const email = testEmail(runId(), 'reset');
  await createMember({ email, name: 'E2E Reset', role: 'BIDDER' });
  const newPassword = 'BrandNew456';

  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Send code' }).click();
  await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();

  await fillOtp(page, STUB_OTP);
  await page.getByLabel('New password', { exact: true }).fill(newPassword);
  await page.getByLabel('Confirm new password').fill(newPassword);
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page).toHaveURL(/\/login$/);

  // The old password no longer works; the new one does.
  await loginViaUi(page, email, PASSWORD);
  await expect(page.getByText('Incorrect email or password.')).toBeVisible();
  await loginViaUi(page, email, newPassword);
  await expect(page).toHaveURL(/\/auctions$/);
});

test('reset with a wrong code keeps the user on the form with an error', async ({ page }) => {
  const email = testEmail(runId(), 'badcode');
  await createMember({ email, name: 'E2E Bad Code', role: 'BIDDER' });
  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Send code' }).click();
  await fillOtp(page, '000000');
  await page.getByLabel('New password', { exact: true }).fill('BrandNew456');
  await page.getByLabel('Confirm new password').fill('BrandNew456');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
  await expect(page).not.toHaveURL(/\/login$/);
});

test('unverified login goes to the verify-email step and the stub code finishes it', async ({ page }) => {
  const email = testEmail(runId(), 'unverified');
  await createMember({ email, name: 'E2E Unverified', role: 'BIDDER', verified: false });
  await loginViaUi(page, email);
  await expect(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible();
  await fillOtp(page, STUB_OTP);
  await expect(page).toHaveURL(/\/auctions$/);
  expect((await memberByEmail(email)).emailVerifiedAt).not.toBeNull();
});
