'use client';
import { PagedList } from '@/components/common/paged-list';
import { StatusTabs } from '@/components/common/status-tabs';
import { ADMIN_PAGE_SIZES } from '../use-url-state';

/** Admin pages keep importing these from here; the implementations are generic (components/common). */
export const AdminList = PagedList;
export { StatusTabs, ADMIN_PAGE_SIZES };
