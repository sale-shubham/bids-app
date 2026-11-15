import { api } from '@/lib/api-client';
import type { AuthMember } from '@/store/auth-store';

export async function fetchMe(): Promise<AuthMember> {
  const res = await api.get('/members/me');
  return res.data.data.member;
}

export interface UpdateMeInput {
  name?: string;
  phone?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
}

export async function updateMe(input: UpdateMeInput): Promise<Partial<AuthMember>> {
  const res = await api.patch('/members/me', input);
  const data = res.data.data;
  return data?.member ?? data ?? {};
}

// Phone verification: the code is texted to the 10-digit number; `sentTo` is masked.
export async function sendPhoneOtp(phone: string): Promise<{ sentTo: string }> {
  const res = await api.post('/members/me/phone/otp', { phone });
  return res.data.data;
}

export async function verifyPhone(input: { phone: string; code: string }): Promise<Partial<AuthMember>> {
  const res = await api.post('/members/me/phone/verify', input);
  const data = res.data.data;
  return data?.member ?? data ?? {};
}
