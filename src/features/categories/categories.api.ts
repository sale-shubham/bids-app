import { api } from '@/lib/api-client';
import { parseAdminCategories, parseCategoryTree } from './categories.parse';
import type { CategoryWritePayload } from './categories.types';

export async function fetchCategoryTree() {
  const res = await api.get('/categories');
  return parseCategoryTree(res.data);
}

export async function fetchAdminCategories() {
  const res = await api.get('/admin/categories');
  return parseAdminCategories(res.data);
}

export const createCategory = (body: CategoryWritePayload) => api.post('/admin/categories', body).then((r) => r.data.data);

export const updateCategory = (id: string, body: Partial<CategoryWritePayload>) =>
  api.patch(`/admin/categories/${encodeURIComponent(id)}`, body).then((r) => r.data.data);

export const deleteCategory = (id: string) => api.delete(`/admin/categories/${encodeURIComponent(id)}`).then((r) => r.data);
