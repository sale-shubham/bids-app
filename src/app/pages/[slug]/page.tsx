import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LEGAL_PAGES, LEGAL_PAGE_SLUGS, legalPageName } from '@/constants/legal';
import { LegalPageView } from './legal-page-view';

// Admin-managed content pages (Privacy Policy, Terms & Conditions). The page
// set is fixed in code — the admin edits content only — so an unknown slug is
// a 404, not an empty page.
export function generateStaticParams() {
  return LEGAL_PAGES.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${legalPageName(slug)} — NobleBid` };
}

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!LEGAL_PAGE_SLUGS.includes(slug)) notFound();
  return <LegalPageView slug={slug} />;
}
