'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Paged } from '@/lib/paged';
import { usePagedList } from '@/hooks/use-paged-list';
import * as api from './admin.api';
import type { AdminSettings, LegalSlug } from './admin.types';

export const adminKeys = {
  all: ['admin'] as const,
  dashboard: ['admin', 'dashboard'] as const,
  settings: ['admin', 'settings'] as const,
  legal: (slug: LegalSlug) => ['admin', 'legal', slug] as const,
};

export function useAdminDashboard() {
  return useQuery({ queryKey: adminKeys.dashboard, queryFn: api.fetchDashboard });
}

/** Admin lists share `usePagedList`; keys stay `['admin', resource, 'list' | 'infinite', ...]`. */
export function useAdminList<T, F extends object>(
  resource: string,
  filters: F,
  page: number,
  pageSize: number,
  fetcher: (f: F, page: number, pageSize: number) => Promise<Paged<T>>,
) {
  return usePagedList<T, F>(['admin', resource], filters, page, pageSize, fetcher);
}

export const useAdminMembers = (f: Parameters<typeof api.fetchMembers>[0], page: number, size: number) =>
  useAdminList('members', f, page, size, api.fetchMembers);
export const useAdminAuctions = (f: { status: string; q: string }, page: number, size: number) =>
  useAdminList('auctions', f, page, size, api.fetchAdminAuctions);
export const useAdminCommissions = (f: { status: string }, page: number, size: number) =>
  useAdminList('commissions', f, page, size, api.fetchAdminCommissions);
export const useAdminPayments = (f: { status: string }, page: number, size: number) =>
  useAdminList('payments', f, page, size, api.fetchAdminPayments);

export const useAdminSales = (f: { status: string; q: string }, page: number, size: number) =>
  useAdminList('sales', f, page, size, api.fetchAdminSales);

export function useReleaseSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.releaseSale(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminKeys.all });
      void qc.invalidateQueries({ queryKey: ['sales'] });
    },
  });
}

export function useRefundSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => api.refundSale(id, note),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminKeys.all });
      void qc.invalidateQueries({ queryKey: ['sales'] });
    },
  });
}

export function useUpdateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; isActive?: boolean; verified?: boolean }) => api.updateMember(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

export function useAdjustCredits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; amountPaise: number; note: string }) => api.adjustCredits(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

export function useCancelAdminAuction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.cancelAuction(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminKeys.all });
      void qc.invalidateQueries({ queryKey: ['auctions'] });
    },
  });
}

export function useWaiveCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => api.waiveCommission(id, note),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminKeys.all });
      void qc.invalidateQueries({ queryKey: ['commissions'] });
    },
  });
}

export function useAdminSettings() {
  return useQuery({ queryKey: adminKeys.settings, queryFn: api.fetchSettings });
}

export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminSettings) => api.saveSettings(body),
    onSuccess: (data) => {
      qc.setQueryData(adminKeys.settings, data);
      void qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useLegalPage(slug: LegalSlug) {
  return useQuery({ queryKey: adminKeys.legal(slug), queryFn: () => api.fetchLegal(slug) });
}

export function useSaveLegal(slug: LegalSlug) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; content: string }) => api.saveLegal(slug, body),
    onSuccess: (data) => qc.setQueryData(adminKeys.legal(slug), data),
  });
}
