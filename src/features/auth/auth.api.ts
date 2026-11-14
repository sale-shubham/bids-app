import { api } from '@/lib/api-client';
import type { AuthMember } from '@/store/auth-store';
import type { DeviceInfo } from '@/lib/device-info';

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
}): Promise<OtpSent> {
  const res = await api.post('/auth/signup', input);
  return res.data.data;
}

// Signup step 2: verify the emailed code — sets the auth cookies.
export async function signupVerify(input: { email: string; code: string }): Promise<AuthMember> {
  const res = await api.post('/auth/signup/verify', input);
  return res.data.data.member;
}

export async function signupResend(input: { email: string }): Promise<{ resendAfterSec: number }> {
  const res = await api.post('/auth/signup/resend', input);
  return res.data.data;
}

// 403 EMAIL_NOT_VERIFIED means the backend just emailed a fresh code.
export async function login(input: { email: string; password: string }): Promise<AuthMember> {
  const res = await api.post('/auth/login', input);
  return res.data.data.member;
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
