'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './categories.api';
import type { CategoryWritePayload } from './categories.types';

export const categoryKeys = {
  tree: ['categories', 'tree'] as const,
  admin: ['categories', 'admin'] as const,
};

/** Public category tree (browse filter, sell form). */
export function useCategoryTree() {
  return useQuery({ queryKey: categoryKeys.tree, queryFn: api.fetchCategoryTree, staleTime: 5 * 60_000 });
}

/** Flat admin list incl. inactive categories and auction counts. */
export function useAdminCategories() {
  return useQuery({ queryKey: categoryKeys.admin, queryFn: api.fetchAdminCategories });
}

function useInvalidateCategories() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: ['categories'] });
}

export function useCreateCategory() {
  const done = useInvalidateCategories();
  return useMutation({ mutationFn: (b: CategoryWritePayload) => api.createCategory(b), onSuccess: done });
}

export function useUpdateCategory() {
  const done = useInvalidateCategories();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<CategoryWritePayload>) => api.updateCategory(id, body),
    onSuccess: done,
  });
}

export function useDeleteCategory() {
  const done = useInvalidateCategories();
  return useMutation({ mutationFn: (id: string) => api.deleteCategory(id), onSuccess: done });
}
