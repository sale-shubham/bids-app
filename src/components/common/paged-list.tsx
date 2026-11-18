'use client';
import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ResponsiveList } from '@/components/common/responsive-list';
import { apiErrorMessage } from '@/lib/api-client';
import type { PagedListResult } from '@/hooks/use-paged-list';

interface Props<T> {
  list: PagedListResult<T>;
  page: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  renderTable: (items: T[]) => React.ReactNode;
  renderCard: (item: T) => React.ReactNode;
  getKey: (item: T) => React.Key;
  empty: {
    icon: LucideIcon;
    title: string;
    description: string;
    /** Optional call to action: a link (`actionHref`) or a click handler (`onAction`). */
    actionLabel?: string;
    actionHref?: string;
    onAction?: () => void;
  };
  /** Fallback message for the error state. */
  errorTitle?: string;
}

/** Desktop table + mobile cards with the shared loading / empty / error states. */
export function PagedList<T>({
  list,
  onPageChange,
  onPageSizeChange,
  renderTable,
  renderCard,
  getKey,
  empty,
  errorTitle = 'Could not load this list',
}: Props<T>) {
  const { desktop, mobile } = list;
  if (list.error && !desktop.data && !mobile.data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{apiErrorMessage(list.error, errorTitle)}</p>
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
