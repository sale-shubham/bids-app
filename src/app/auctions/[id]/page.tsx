import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/public-header';
import { AuctionDetailView } from '@/features/auctions/components/auction-detail';
import { getAuctionDetailServer } from '@/features/auctions/auctions.server';
import type { AuctionDetail } from '@/features/auctions/auctions.types';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3002').replace(/\/+$/, '');

function excerpt(html: string, max = 160) {
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { auction } = await getAuctionDetailServer(id);
  const description = excerpt(auction.description);
  return {
    title: `${auction.title} — NobleBid`,
    description,
    alternates: { canonical: `/auctions/${id}` },
    openGraph: {
      title: auction.title,
      description,
      url: `${SITE_URL}/auctions/${id}`,
      type: 'website',
      images: auction.coverImage ? [{ url: auction.coverImage }] : undefined,
    },
    twitter: { card: 'summary_large_image', title: auction.title, description, images: auction.coverImage ? [auction.coverImage] : undefined },
  };
}

function availability(status: AuctionDetail['status']) {
  if (status === 'LIVE') return 'https://schema.org/InStock';
  if (status === 'SCHEDULED') return 'https://schema.org/PreOrder';
  return 'https://schema.org/SoldOut';
}

function jsonLd(a: AuctionDetail) {
  const url = `${SITE_URL}/auctions/${a.id}`;
  const price = (a.bidCount > 0 ? a.currentBidPaise : a.startingBidPaise) / 100;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: a.title,
      description: excerpt(a.description, 500),
      image: a.images.length ? a.images : a.coverImage ? [a.coverImage] : undefined,
      category: a.category,
      itemCondition: a.condition === 'NEW' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
      offers: {
        '@type': 'Offer',
        url,
        price: price.toFixed(2),
        priceCurrency: 'INR',
        availability: availability(a.status),
        priceValidUntil: a.endTime,
        seller: { '@type': 'Person', name: a.seller.name },
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: `Auction: ${a.title}`,
      startDate: a.startTime,
      endDate: a.endTime,
      eventStatus: a.status === 'CANCELLED' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
      location: { '@type': 'VirtualLocation', url },
      image: a.coverImage ?? undefined,
    },
  ];
}

export default async function AuctionDetailPage({ params }: Props) {
  const { id } = await params;
  const { auction, serverTime } = await getAuctionDetailServer(id);
  // `<` escaped so seller-authored text can never close the script tag.
  const ld = JSON.stringify(jsonLd(auction)).replace(/</g, '\\u003c');

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />
        <AuctionDetailView initial={auction} serverTime={serverTime} />
      </main>
    </div>
  );
}
