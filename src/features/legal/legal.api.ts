import { api } from '@/lib/api-client';

// Admin-managed legal/content pages (Privacy Policy, Terms & Conditions).
// `content` is HTML authored in the admin rich-text editor; empty string means
// the admin hasn't published that page yet.
export interface LegalPage {
  slug: string;
  name: string;
  content: string;
  updatedAt: string | null;
}

// Public, unauthenticated — signup links to these before an account exists.
export async function fetchLegalPage(slug: string): Promise<LegalPage> {
  const res = await api.get(`/settings/pages/${slug}`);
  return res.data.data.page;
}

export async function fetchLegalPages(): Promise<LegalPage[]> {
  const res = await api.get('/settings/pages');
  return res.data.data.pages;
}
