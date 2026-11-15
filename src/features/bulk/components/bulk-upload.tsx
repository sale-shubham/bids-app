'use client';
import * as React from 'react';
import Link from 'next/link';
import { CheckCircle2, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { AuctionCard } from '@/features/auctions/auctions.types';
import { filesToUpload, indexFiles, mapRows, MAX_BULK_IMAGES_PER_ROW, MAX_BULK_ROWS, missingImages, parseCsv, templateCsv, toPayload } from '../bulk.csv';
import { bulkErrorMessage, bulkRowErrors } from '../bulk.errors';
import type { BulkRow, RowError } from '../bulk.types';
import { useBulkCreate, useBulkImageUpload } from '../use-bulk';
import { BulkPreviewTable } from './bulk-preview-table';

function downloadTemplate() {
  const url = URL.createObjectURL(new Blob([templateCsv()], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'noblebid-bulk-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// /sell/bulk: CSV + image files -> preview with per-row problems -> resized image uploads -> POST /auctions/bulk.
export function BulkUpload() {
  const [rows, setRows] = React.useState<BulkRow[] | null>(null);
  const [fileErrors, setFileErrors] = React.useState<string[]>([]);
  const [images, setImages] = React.useState<File[]>([]);
  const [serverErrors, setServerErrors] = React.useState<Map<number, RowError[]>>(new Map());
  const [formError, setFormError] = React.useState<string | null>(null);
  const [created, setCreated] = React.useState<AuctionCard[] | null>(null);
  const [phase, setPhase] = React.useState<'idle' | 'uploading' | 'creating'>('idle');
  const bulk = useBulkCreate();
  const { uploadAll, progress } = useBulkImageUpload();

  const files = React.useMemo(() => indexFiles(images), [images]);
  const ready = !!rows?.length && fileErrors.length === 0 && rows.every((r) => !!r.draft && missingImages(r, files).length === 0);
  const busy = phase !== 'idle';

  const onCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const parsed = parseCsv(await file.text());
    setFileErrors(parsed.fileErrors);
    setRows(parsed.rows.length ? mapRows(parsed.rows, new Date()) : null);
    setServerErrors(new Map());
    setFormError(null);
    setCreated(null);
  };

  const onImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImages(Array.from(e.target.files ?? []));
    setServerErrors(new Map());
    e.target.value = '';
  };

  const submit = async () => {
    if (!rows || !ready) return;
    setFormError(null);
    setServerErrors(new Map());
    try {
      setPhase('uploading');
      const urls = await uploadAll(filesToUpload(rows, files));
      setPhase('creating');
      const now = new Date();
      const items = await bulk.mutateAsync(rows.map((r) => toPayload(r, urls, now)));
      setCreated(items);
      setRows(null);
      toast.success(`${items.length} auction${items.length === 1 ? '' : 's'} created`);
    } catch (err) {
      setServerErrors(bulkRowErrors(err));
      setFormError(bulkErrorMessage(err));
    } finally {
      setPhase('idle');
    }
  };

  if (created) {
    return (
      <div className="space-y-4">
        <p className="inline-flex items-center gap-2 font-medium">
          <CheckCircle2 className="h-5 w-5 text-success" aria-hidden /> {created.length} auction{created.length === 1 ? '' : 's'} created
        </p>
        <ul className="divide-y rounded-xl border">
          {created.map((a) => (
            <li key={a.id} className="p-3">
              <Link href={`/auctions/${a.id}`} className="font-medium hover:underline">
                {a.title}
              </Link>
            </li>
          ))}
        </ul>
        <Button variant="outline" onClick={() => setCreated(null)}>
          Upload another batch
        </Button>
      </div>
    );
  }

  const invalidCount = rows?.filter((r) => !r.draft).length ?? 0;
  const unmatched = rows?.filter((r) => missingImages(r, files).length > 0).length ?? 0;

  return (
    <div className="space-y-6">
      <section className="space-y-2 rounded-xl border p-4">
        <h2 className="font-semibold">1. Get the template</h2>
        <p className="text-sm text-muted-foreground">
          One row per item, up to {MAX_BULK_ROWS} rows and {MAX_BULK_IMAGES_PER_ROW} images each. Prices are in rupees. startAt is &quot;now&quot; or an ISO date/time,
          and images are file names separated by <code>|</code>.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="h-4 w-4" /> Download CSV template
        </Button>
      </section>

      <section className="space-y-3 rounded-xl border p-4">
        <h2 className="font-semibold">2. Choose your files</h2>
        <div className="grid gap-3 @2xl/content:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">CSV file</span>
            <input type="file" accept=".csv,text/csv" aria-label="CSV file" onChange={(e) => void onCsv(e)} disabled={busy} className="block w-full text-sm" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Image files</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple aria-label="Image files" onChange={onImages} disabled={busy} className="block w-full text-sm" />
            <span className="block text-xs text-muted-foreground">{images.length} selected. Names are matched ignoring upper/lower case. Photos are resized before upload.</span>
          </label>
        </div>
        {fileErrors.map((m) => (
          <p key={m} className="text-sm text-destructive" role="alert">
            {m}
          </p>
        ))}
      </section>

      {rows && (
        <section className="space-y-3">
          <h2 className="font-semibold">3. Review</h2>
          <BulkPreviewTable rows={rows} files={files} serverErrors={serverErrors} />
          {(invalidCount > 0 || unmatched > 0) && (
            <p className="text-sm text-destructive">
              {invalidCount > 0 && `${invalidCount} row${invalidCount === 1 ? ' has' : 's have'} problems in the CSV. `}
              {unmatched > 0 && `${unmatched} row${unmatched === 1 ? ' is' : 's are'} missing image files. `}
              Fix them and choose the files again.
            </p>
          )}
          {formError && (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          )}
          {phase === 'uploading' && progress && (
            <p className="text-sm text-muted-foreground" role="status">
              Uploading images… {progress.done} / {progress.total}
            </p>
          )}
          <Button type="button" disabled={!ready || busy} onClick={() => void submit()}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {phase === 'creating' ? 'Creating auctions…' : phase === 'uploading' ? 'Uploading…' : `Create ${rows.length} auction${rows.length === 1 ? '' : 's'}`}
          </Button>
        </section>
      )}
    </div>
  );
}
