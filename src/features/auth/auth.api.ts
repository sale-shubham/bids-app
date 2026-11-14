import { api } from '@/lib/api-client';
import type { AuthMember } from '@/store/auth-store';
import type { DeviceInfo } from '@/lib/device-info';

export type SignupRole = 'BIDDER' | 'AUCTIONEER';

// Login = email + password.
export async function login(input: {
  email: string;
  password: string;
  deviceInfo: DeviceInfo;
}): Promise<AuthMember> {
  const res = await api.post('/auth/login', input);
  return res.data.data.member;
}

// Signup step 1: creates a pending signup and emails an OTP.
export async function signupStart(input: {
  name: string;
  email: string;
  password: string;
  role: SignupRole;
}): Promise<{ signupSessionId: string; email: string; expiresInSeconds: number }> {
  const res = await api.post('/auth/signup/start', input);
  return res.data.data;
}

// Signup step 2: verify the emailed OTP — completes signup and logs in.
export async function signupVerify(input: {
  signupSessionId: string;
  code: string;
  consent: true;
  deviceInfo: DeviceInfo;
}): Promise<AuthMember> {
  const res = await api.post('/auth/signup/verify', input);
  return res.data.data.member;
}

export async function signupResend(input: {
  signupSessionId: string;
}): Promise<{ expiresInSeconds: number }> {
  const res = await api.post('/auth/signup/resend', input);
  return res.data.data;
}

export async function forgotPassword(input: { email: string }) {
  await api.post('/auth/password/forgot', input);
}

export async function resetPassword(input: { email: string; code: string; password: string }) {
  await api.post('/auth/password/reset', input);
}

// Self-service device management — this account's own logged-in devices
// (bids-api's `GET`/`DELETE /auth/sessions`). Works the same for SUPER_ADMIN
// as for a regular Member — there is no separate admin session store.
export interface DeviceSession {
  id: string;
  deviceInfo: DeviceInfo | null;
  userAgent: string | null;
  ip: string | null;
  lastUsedAt: string;
  createdAt: string;
  isCurrent: boolean;
}
export async function fetchMySessions(): Promise<DeviceSession[]> {
  const res = await api.get('/auth/sessions');
  return res.data.data.sessions;
}
export async function revokeMySession(id: string): Promise<void> {
  await api.delete(`/auth/sessions/${id}`);
}

export async function logout() {
  await api.post('/auth/logout');
}

export async function fetchMe(): Promise<AuthMember> {
  const res = await api.get('/members/me');
  return res.data.data;
}

// Profile page's Edit name — the only self-editable member field.
export async function updateMyName(name: string) {
  const res = await api.patch('/members/me', { name });
  return res.data.data as { member: Pick<AuthMember, 'id' | 'email' | 'name'>; message: string };
}

// Upload a file's raw bytes to a presigned PUT URL. Uses fetch (not the `api`
// axios instance) so no auth/withCredentials headers are attached — for a real
// S3 presigned URL any extra signed-header mismatch causes 403. Content-Type
// MUST equal the `type` the URL was signed with.
export async function uploadToPresigned(url: string, file: File) {
  const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
}
