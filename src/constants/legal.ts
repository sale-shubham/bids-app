// Mirrors the API's fixed legal-page catalogue
// (bids-api/src/modules/settings/legal-pages.constants.ts). Content is admin-
// managed; only the slug + display name are static.
export const LEGAL_PAGES = [
  { slug: 'privacy-policy', name: 'Privacy Policy' },
  { slug: 'terms-conditions', name: 'Terms and Conditions' },
] as const;

export type LegalPageSlug = (typeof LEGAL_PAGES)[number]['slug'];

export const LEGAL_PAGE_SLUGS: string[] = LEGAL_PAGES.map((p) => p.slug);

export const legalPagePath = (slug: LegalPageSlug) => `/pages/${slug}`;

export const legalPageName = (slug: string) =>
  PUBLIC_LEGAL_PAGES.find((p) => p.slug === slug)?.name ?? 'Page';


// Public pages read from GET /settings/legal/:slug (server-rendered). Refund
// Policy is public-only here; the admin editor keeps using LEGAL_PAGES.
export const PUBLIC_LEGAL_PAGES = [
  { slug: 'terms-conditions', name: 'Terms and Conditions' },
  { slug: 'privacy-policy', name: 'Privacy Policy' },
  { slug: 'refund-policy', name: 'Refund Policy' },
] as const;

export const PUBLIC_LEGAL_SLUGS: string[] = PUBLIC_LEGAL_PAGES.map((p) => p.slug);
