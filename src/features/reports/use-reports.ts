'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminList } from '@/features/admin/use-admin';
import * as api from './reports.api';
import type { AdminReportFilters } from './reports.types';

export function useCreateReport() {
  return useMutation({ mutationFn: api.createReport });
}

export const useAdminReports = (f: AdminReportFilters, page: number, size: number) =>
  useAdminList('reports', f, page, size, api.fetchAdminReports);

export function useResolveReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.resolveReport,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'reports'] }),
  });
}
