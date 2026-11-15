'use client';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { nextPagedParam } from '@/lib/paged';
import * as api from './invoices.api';
import type { InvoiceSettings } from './invoices.types';

export const INVOICE_SETTINGS_KEY = ['admin', 'invoice-settings'] as const;

export function useMyInvoices() {
  return useInfiniteQuery({
    queryKey: ['invoices', 'mine'],
    queryFn: ({ pageParam }) => api.fetchMyInvoices(pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPagedParam,
  });
}

/** Fetches the short-lived PDF URL and opens it in a new tab. */
export function useDownloadInvoice() {
  return useMutation({
    mutationFn: async (id: string) => {
      const url = await api.fetchInvoicePdfUrl(id);
      if (!url) throw new Error('No download link');
      window.open(url, '_blank', 'noopener,noreferrer');
    },
  });
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
