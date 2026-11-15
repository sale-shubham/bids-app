import axios from 'axios';
import { apiErrorCode, apiErrorDetails } from '@/lib/api-client';
import { auctionErrorMessage } from '@/features/auctions/auctions.errors';
import type { RowError } from './bulk.types';

/** Per-row errors of a `BULK_INVALID` response, keyed by the 0-based row index. Empty for any other error. */
export function bulkRowErrors(err: unknown): Map<number, RowError[]> {
  const out = new Map<number, RowError[]>();
  if (apiErrorCode(err) !== 'BULK_INVALID') return out;
  const rows = apiErrorDetails(err)?.rows;
  if (!Array.isArray(rows)) return out;
  for (const r of rows as { index?: unknown; errors?: unknown }[]) {
    if (typeof r?.index !== 'number' || !Array.isArray(r.errors)) continue;
    out.set(
      r.index,
      (r.errors as { field?: unknown; message?: unknown }[]).map((e) => ({ field: String(e.field ?? ''), message: String(e.message ?? 'Invalid value') })),
    );
  }
  return out;
}

export function bulkErrorMessage(err: unknown) {
  if (apiErrorCode(err) === 'BULK_INVALID') return 'Some rows need fixing. Nothing was created. Fix the rows marked below and upload again.';
  if (axios.isAxiosError(err) && (err.response?.status === 429 || apiErrorCode(err) === 'TOO_MANY_REQUESTS')) {
    return 'You can run at most 5 bulk uploads per hour. Please try again later.';
  }
  return auctionErrorMessage(err, 'Bulk upload failed');
}
