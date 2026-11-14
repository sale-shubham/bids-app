import type { Page } from '@playwright/test';
import { PASSWORD } from './env.ts';

/** Logs in through the real form. */
export async function loginViaUi(page: Page, email: string, password = PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
}

/** Fills the 6-cell OTP input (cells are labelled "Digit 1" ... "Digit 6"; a multi-digit insert is split across cells). */
export async function fillOtp(page: Page, code: string) {
  await page.getByLabel('Digit 1').fill(code);
}

/** Money as the app prints it, e.g. 150000 -> "₹1,500". */
export const rupees = (paise: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: paise % 100 === 0 ? 0 : 2 }).format(paise / 100);

/**
 * Keeps the opt-in prompts (push permission, PWA install) out of the way: they
 * are toasts that can land on top of whatever a test clicks next.
 */
export const SUPPRESS_PROMPTS = [
  ['noblebid-push-asked:web', '1'],
  ['noblebid-push-asked:app', '1'],
  ['noblebid-install-dismissed', String(Date.now())],
] as const;
