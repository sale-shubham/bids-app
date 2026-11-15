import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PUBLIC_LEGAL_SLUGS, legalPageName } from '@/constants/legal';
import { RichText } from '@/components/common/rich-text';
import { getLegalDocServer } from '@/features/settings/settings.server';

// Admin-managed legal pages, server-rendered from GET /settings/legal/:slug.
// The slug set is fixed in code; an unknown slug (or a 404 from the API) is a 404.
export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return PUBLIC_LEGAL_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!PUBLIC_LEGAL_SLUGS.includes(slug)) return {};
  const doc = await getLegalDocServer(slug);
  const title = doc?.title ?? legalPageName(slug);
  return {
    title: `${title} — NobleBid`,
    description: `${title} for NobleBid, the online auction marketplace.`,
    alternates: { canonical: `/pages/${slug}` },
  };
}

export default async function ContentPage({ params }: Props) {
  const { slug } = await params;
  if (!PUBLIC_LEGAL_SLUGS.includes(slug)) notFound();
  const doc = await getLegalDocServer(slug);
  const title = doc?.title ?? legalPageName(slug);

  return (
    <article className="mx-auto max-w-3xl py-2">
      <h1 className="text-3xl font-bold tracking-tight @3xl/content:text-4xl">{title}</h1>
      {doc?.updatedAt && (
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated{' '}
          {new Date(doc.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      )}
      <div className="mt-8">
        {doc === null ? (
          <p className="text-sm text-muted-foreground">Could not load this page right now. Please try again later.</p>
        ) : doc.content ? (
          <RichText html={doc.content} />
        ) : (
          <p className="text-sm text-muted-foreground">This page has not been published yet.</p>
        )}
      </div>
    </article>
  );
}
