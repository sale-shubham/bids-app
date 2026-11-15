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
  /** 15-character GSTIN; null clears it. */
  gstin?: string | null;
  /** 2-digit GST state code; null clears it. */
  billingState?: string | null;
}

export async function updateMe(input: UpdateMeInput): Promise<Partial<AuthMember>> {
  const res = await api.patch('/members/me', input);
  const data = res.data.data;
  return data?.member ?? data ?? {};
}

