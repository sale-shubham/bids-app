// The marketing website is a separate site/repo (bids-website). The app only
// links out to it: always as an absolute `<a href>` (never next/link), since it
// is a different origin. Read at build time (NEXT_PUBLIC_*).
export const WEBSITE_URL = (process.env.NEXT_PUBLIC_WEBSITE_URL || 'http://localhost:3000').replace(/\/+$/, '');

export const websiteUrl = (path: string) => `${WEBSITE_URL}${path.startsWith('/') ? path : `/${path}`}`;

export const WEBSITE_LINKS = [
  { label: 'About', href: websiteUrl('/about') },
  { label: 'How it works', href: websiteUrl('/how-it-works') },
  { label: 'Contact', href: websiteUrl('/contact') },
] as const;
