import { serverGet } from '@/lib/server-api';

// Public (unauthenticated) settings + legal copy, for server components.

export interface PublicSettings {
  commissionRateBps: number;
  minIncrementPaise: number;
  antiSnipingMinutes: number;
  categories: string[];
}

export interface LegalDoc {
  slug: string;
  title: string;
  content: string;
  updatedAt: string | null;
}

/** Null when the API is unreachable: pages fall back to generic copy. */
export async function getPublicSettingsServer(): Promise<PublicSettings | null> {
  try {
    return await serverGet<PublicSettings>('/settings/public', { revalidate: 300, notFoundOn404: false });
  } catch {
    return null;
  }
}

/** Calls notFound() on a 404 (unknown slug); any other failure returns null. */
export async function getLegalDocServer(slug: string): Promise<LegalDoc | null> {
  try {
    return await serverGet<LegalDoc>(`/settings/legal/${encodeURIComponent(slug)}`, { revalidate: 300 });
  } catch (e) {
    // notFound() throws a special error (it carries a `digest`) that must propagate.
    if (e instanceof Error && 'digest' in e) throw e;
    return null;
  }
}
