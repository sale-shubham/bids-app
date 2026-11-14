'use client';
import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponsiveList } from '@/components/common/responsive-list';
import { apiErrorMessage } from '@/lib/api-client';
import { ADMIN_PAGE_SIZES } from '../use-url-state';
import type { useAdminList } from '../use-admin';

type List<T> = ReturnType<typeof useAdminList<T, never>>;

interface Props<T> {
  list: List<T>;
  page: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  renderTable: (items: T[]) => React.ReactNode;
  renderCard: (item: T) => React.ReactNode;
  getKey: (item: T) => React.Key;
  empty: { icon: LucideIcon; title: string; description: string };
}

/** Desktop table + mobile cards with the shared loading / empty / error states. */
export function AdminList<T>({ list, onPageChange, onPageSizeChange, renderTable, renderCard, getKey, empty }: Props<T>) {
  const { desktop, mobile } = list;
  if (list.error && !desktop.data && !mobile.data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{apiErrorMessage(list.error, 'Could not load this list')}</p>
          <Button variant="outline" onClick={() => void list.refetch()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }
  return (
    <ResponsiveList<T>
      desktop={{
        items: desktop.data?.items ?? [],
        isLoading: desktop.isLoading,
        meta: desktop.data?.meta,
        onPageChange,
        onPageSizeChange,
        renderTable,
      }}
      mobile={{
        items: list.mobileItems,
        isLoading: mobile.isLoading,
        hasNextPage: !!mobile.hasNextPage,
        isFetchingNextPage: mobile.isFetchingNextPage,
        fetchNextPage: () => void mobile.fetchNextPage(),
        renderCard,
      }}
      empty={empty}
      getKey={getKey}
    />
  );
}

export { ADMIN_PAGE_SIZES };

/** Status tab bar bound to a URL param. */
export function StatusTabs({
  value,
  tabs,
  onChange,
}: {
  value: string;
  tabs: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <Tabs value={value} onValueChange={onChange}>
      <TabsList>
        {tabs.map((t) => (
          <TabsTrigger key={t.value} value={t.value}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export function PageHeader({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 @lg/content:flex-row @lg/content:items-center @lg/content:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
