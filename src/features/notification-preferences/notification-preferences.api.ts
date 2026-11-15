import { api } from '@/lib/api-client';

export interface PreferenceItem {
  type: string;
  label: string;
  group: string;
  email: boolean;
  push: boolean;
  emailLocked: boolean;
}

export interface NotificationPreferences {
  items: PreferenceItem[];
}

export type PreferenceInput = Pick<PreferenceItem, 'type' | 'email' | 'push'>;

export async function fetchPreferences(): Promise<NotificationPreferences> {
  const res = await api.get('/members/me/notification-preferences');
  return res.data.data;
}

export async function savePreferences(items: PreferenceInput[]): Promise<NotificationPreferences> {
  const res = await api.put('/members/me/notification-preferences', { items });
  return res.data.data;
}
