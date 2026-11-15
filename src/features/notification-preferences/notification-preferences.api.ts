import { api } from '@/lib/api-client';

export interface PreferenceItem {
  type: string;
  label: string;
  group: string;
  email: boolean;
  push: boolean;
  whatsapp: boolean;
  emailLocked: boolean;
  whatsappCapable: boolean;
}

export interface NotificationPreferences {
  items: PreferenceItem[];
  whatsappOptIn: boolean;
  phoneVerified: boolean;
}

export type PreferenceInput = Pick<PreferenceItem, 'type' | 'email' | 'push' | 'whatsapp'>;

export async function fetchPreferences(): Promise<NotificationPreferences> {
  const res = await api.get('/members/me/notification-preferences');
  return res.data.data;
}

export async function savePreferences(items: PreferenceInput[]): Promise<NotificationPreferences> {
  const res = await api.put('/members/me/notification-preferences', { items });
  return res.data.data;
}

/** Returns the new opt-in state. The API answers `{ whatsappOptIn }` (or the updated member); both are read. */
export async function setWhatsappOptIn(optIn: boolean): Promise<boolean> {
  const res = await api.post('/members/me/whatsapp', { optIn });
  const d = res.data?.data;
  const v = d?.whatsappOptIn ?? d?.member?.whatsappOptIn;
  return typeof v === 'boolean' ? v : optIn;
}
