import type { Metadata } from 'next';
import { BulkUpload } from '@/features/bulk/components/bulk-upload';

export const metadata: Metadata = { title: 'Bulk upload — NobleBid' };

export default function BulkUploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bulk upload</h1>
        <p className="text-muted-foreground">List up to 50 items at once from a CSV and a set of photos.</p>
      </div>
      <BulkUpload />
    </div>
  );
}
