import type { Metadata } from 'next';
import { PageHeader } from '@/components/common/page-header';
import { BulkUpload } from '@/features/bulk/components/bulk-upload';

export const metadata: Metadata = { title: 'Bulk upload — NobleBid' };

export default function BulkUploadPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Bulk upload" description="List up to 50 items at once from a CSV and a set of photos." backHref="/sell/auctions" backLabel="Back to my auctions" />
      <BulkUpload />
    </div>
  );
}
