import { api } from '@/lib/api-client';
import type { AuthMember } from '@/store/auth-store';
import { getDeviceInfo, type DeviceInfo } from '@/lib/device-info';

// Every success body is the bids-api envelope `{ success: true, data }`.
export type SignupRole = 'BIDDER' | 'AUCTIONEER';

export interface OtpSent {
  email: string;
  resendAfterSec: number;
}

// Signup step 1: creates the (unverified) account and emails a code. 409 EMAIL_TAKEN.
export async function signup(input: {
  name: string;
  email: string;
  password: string;
  role: SignupRole;
  /** Remembered `?ref=` code, when there is one. */
  referralCode?: string;
}): Promise<OtpSent> {
  const res = await api.post('/auth/signup', input);
  return res.data.data;
}

// Signup step 2: verify the emailed code — sets the auth cookies.
export async function signupVerify(input: { email: string; code: string }): Promise<AuthMember> {
  const res = await api.post('/auth/signup/verify', { ...input, deviceInfo: getDeviceInfo() });
  return res.data.data.member;
}

export async function signupResend(input: { email: string }): Promise<{ resendAfterSec: number }> {
  const res = await api.post('/auth/signup/resend', input);
  return res.data.data;
}

// Password step result: a session (cookies set) or, when the account has 2FA, a
// challenge to complete at /auth/2fa/verify (no cookies yet).
export type LoginResult = { member: AuthMember } | { twoFactorRequired: true; challengeToken: string };

// 403 EMAIL_NOT_VERIFIED means the backend just emailed a fresh code.
export async function login(input: { email: string; password: string }): Promise<LoginResult> {
  const res = await api.post('/auth/login', { ...input, deviceInfo: getDeviceInfo() });
  const data = res.data.data;
  if (data?.twoFactorRequired) return { twoFactorRequired: true, challengeToken: String(data.challengeToken) };
  return { member: data.member };
}

// Login step 2: a 6-digit authenticator code OR a recovery code. Same body and cookies as a normal login.
export async function twoFactorVerify(input: {
  challengeToken: string;
  code?: string;
  recoveryCode?: string;
}): Promise<AuthMember> {
  const res = await api.post('/auth/2fa/verify', { ...input, deviceInfo: getDeviceInfo() });
  return res.data.data.member;
}

export interface TwoFactorSetup {
  secret: string;
  otpauthUrl: string;
}
export async function twoFactorSetup(): Promise<TwoFactorSetup> {
  const res = await api.post('/auth/2fa/setup');
  return res.data.data;
}
// Recovery codes are returned once, here and from regenerate.
export async function twoFactorEnable(input: { code: string }): Promise<string[]> {
  const res = await api.post('/auth/2fa/enable', input);
  return res.data.data.recoveryCodes;
}
export async function twoFactorDisable(input: { password: string; code: string }) {
  await api.post('/auth/2fa/disable', input);
}
export async function regenerateRecoveryCodes(input: { code: string }): Promise<string[]> {
  const res = await api.post('/auth/2fa/recovery-codes', input);
  return res.data.data.recoveryCodes;
}

// Always 200, whether or not the email has an account.
export async function forgotPassword(input: { email: string }): Promise<{ resendAfterSec: number }> {
  const res = await api.post('/auth/password/forgot', input);
  return res.data.data;
}

// All sessions are revoked on success — the user logs in again.
export async function resetPassword(input: { email: string; code: string; password: string }) {
  await api.post('/auth/password/reset', input);
}

export async function changePassword(input: { currentPassword: string; newPassword: string }) {
  await api.post('/auth/password/change', input);
}

// Self-service device management — this account's own logged-in sessions.
export interface DeviceSession {
  id: string;
  deviceInfo: DeviceInfo | null;
  userAgent: string | null;
  ip: string | null;
  lastUsedAt: string;
  createdAt: string;
  isCurrent: boolean;
}
export async function fetchSessions(): Promise<DeviceSession[]> {
  const res = await api.get('/auth/sessions');
  const data = res.data.data;
  return Array.isArray(data) ? data : data.sessions;
}
export async function revokeSession(id: string): Promise<void> {
  await api.delete(`/auth/sessions/${id}`);
}

export async function logout() {
  await api.post('/auth/logout');
}

export async function logoutAll() {
  await api.post('/auth/logout-all');
}
