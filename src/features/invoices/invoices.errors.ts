import { apiErrorCode, apiErrorMessage } from '@/lib/api-client';

/** Copy for the invoice endpoints. A missing invoice and someone else's invoice both answer 404 `INVOICE_NOT_FOUND`. */
export function invoiceErrorMessage(err: unknown, fallback = 'Could not download the invoice') {
  if (apiErrorCode(err) === 'INVOICE_NOT_FOUND') return 'This invoice could not be found.';
  return apiErrorMessage(err, fallback);
}
