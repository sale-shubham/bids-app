import { api } from '@/lib/api-client';

// Admin-managed legal pages (Terms & Conditions, Privacy Policy, Refund Policy).
// `content` is HTML authored in the admin rich-text editor; empty string means
// the admin hasn't published that page yet.
// API: GET /settings/legal -> { pages: [...] }, GET /settings/legal/:slug -> page.
export interface LegalPage {
  slug: string;
  title: string;
  /** Same as `title`; kept for older callers. */
  name: string;
  content: string;
  updatedAt: string | null;
}

interface RawLegalPage {
  slug: string;
  title?: string;
  name?: string;
  content?: string;
  updatedAt?: string | null;
}

function toLegalPage(raw: RawLegalPage): LegalPage {
  const title = raw.title ?? raw.name ?? raw.slug;
  return {
    slug: raw.slug,
    title,
    name: title,
    content: raw.content ?? '',
    updatedAt: raw.updatedAt ?? null,
  };
}

// Public, unauthenticated — signup links to these before an account exists.
export async function fetchLegalPage(slug: string): Promise<LegalPage> {
  const res = await api.get(`/settings/legal/${encodeURIComponent(slug)}`);
  return toLegalPage(res.data.data as RawLegalPage);
}

export async function fetchLegalPages(): Promise<LegalPage[]> {
  const res = await api.get('/settings/legal');
  return ((res.data.data.pages ?? []) as RawLegalPage[]).map(toLegalPage);
}
