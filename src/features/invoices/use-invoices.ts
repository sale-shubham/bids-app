'use client';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { nextPagedParam } from '@/lib/paged';
import { openPdfTab, showPdf } from '@/lib/pdf';
import * as api from './invoices.api';
import { invoicePdfFilename, type InvoiceSettings } from './invoices.types';

export const INVOICE_SETTINGS_KEY = ['admin', 'invoice-settings'] as const;

export function useMyInvoices() {
  return useInfiniteQuery({
    queryKey: ['invoices', 'mine'],
    queryFn: ({ pageParam }) => api.fetchMyInvoices(pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPagedParam,
  });
}

/**
 * Fetches the invoice PDF and shows it in a tab (or downloads it where the browser has no PDF viewer).
 * Call `download(...)` straight from the click handler: the tab is opened before any await so it is not popup-blocked.
 */
export function useDownloadInvoice() {
  const m = useMutation({
    mutationFn: async ({ id, number, tab }: { id: string; number: string; tab: Window | null }) => {
      try {
        showPdf(await api.fetchInvoicePdf(id), tab, invoicePdfFilename(number));
      } catch (err) {
        tab?.close();
        throw err;
      }
    },
  });
  return {
    download: (inv: { id: string; number: string }, opts?: { onError?: (e: unknown) => void }) =>
      m.mutate({ id: inv.id, number: inv.number, tab: openPdfTab() }, opts),
    isPending: m.isPending,
    /** The invoice id currently being prepared. */
    pendingId: m.isPending ? m.variables?.id : undefined,
  };
}

export function useInvoiceSettings() {
  return useQuery({ queryKey: INVOICE_SETTINGS_KEY, queryFn: api.fetchInvoiceSettings });
}

export function useSaveInvoiceSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: InvoiceSettings) => api.saveInvoiceSettings(body),
    onSuccess: (data) => qc.setQueryData(INVOICE_SETTINGS_KEY, data),
  });
}
