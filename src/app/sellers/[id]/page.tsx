import type { Metadata } from 'next';
import { CalendarDays, Gavel, PackageCheck } from 'lucide-react';
import { PublicPage } from '@/components/layout/public-page';
import { MemberAvatar } from '@/components/common/member-avatar';
import { formatDate } from '@/lib/utils';
import { getSellerServer } from '@/features/sellers/sellers.server';
import { SellerAuctions } from '@/features/sellers/components/seller-auctions';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const seller = await getSellerServer(id);
  const description = `${seller.name} on NobleBid: ${seller.auctionsSold} auctions sold, ${seller.activeAuctions} live right now.`;
  return {
    title: `${seller.name} — Seller on NobleBid`,
    description,
    alternates: { canonical: `/sellers/${id}` },
    openGraph: { title: `${seller.name} — NobleBid seller`, description },
  };
}

export default async function SellerPage({ params }: Props) {
  const { id } = await params;
  const seller = await getSellerServer(id);

  return (
    <PublicPage className="space-y-8">
      <section className="flex flex-col items-center gap-4 rounded-xl border bg-muted/30 p-6 text-center sm:flex-row sm:text-left">
        <MemberAvatar id={seller.id} name={seller.name} email="" avatarUrl={seller.avatarUrl} size="xl" />
        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight">{seller.name}</h1>
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground sm:justify-start">
            <li className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" aria-hidden /> Member since {formatDate(seller.createdAt)}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <PackageCheck className="h-4 w-4" aria-hidden /> {seller.auctionsSold} auctions sold
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Gavel className="h-4 w-4" aria-hidden /> {seller.activeAuctions} active
            </li>
          </ul>
        </div>
      </section>
      <SellerAuctions sellerId={seller.id} />
    </PublicPage>
  );
}
