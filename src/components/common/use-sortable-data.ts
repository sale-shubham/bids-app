'use client';
import * as React from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((cur, key) => (cur as Record<string, unknown> | undefined)?.[key], obj);
}

/**
 * Sort-column click state (key + asc/desc), decoupled from the data itself so
 * a page can thread `sortConfig.key`/`sortConfig.direction` into its
 * `useAdminXxx(...)` query call as `sortBy`/`sortOrder` request params
 * *before* that same query's result gets locally re-sorted by `useSortedItems`
 * below — the two would otherwise be circular (the query needs sortConfig,
 * `useSortedItems` needs the query's data).
 */
export function useSortState() {
  const [sortConfig, setSortConfig] = React.useState<SortConfig | null>(null);

  const requestSort = (key: string) => {
    setSortConfig((prev) =>
      prev?.key === key && prev.direction === 'asc' ? { key, direction: 'desc' } : { key, direction: 'asc' },
    );
  };

  return { sortConfig, requestSort };
}

/**
 * Client-side sort of an already-fetched page of rows (desktop table only —
 * mobile infinite-scroll cards are unsorted) by the given `sortConfig`. Purely
 * a reorder of the rows already on screen — distinct from server-side
 * search/tab/select filtering (docs/PAGINATION.md), never re-fetches or
 * slices. Also re-applied here (not just via the `sortBy`/`sortOrder` request
 * params `useSortState` feeds the query) since the backend isn't guaranteed
 * to honor those params for every list yet — same belt-and-braces pattern as
 * the tapariatools `GenericTable` reference this was modeled on.
 */
export function useSortedItems<T extends object>(items: T[], sortConfig: SortConfig | null): T[] {
  return React.useMemo(() => {
    if (!sortConfig) return items;
    const { key, direction } = sortConfig;

    return [...items].sort((a, b) => {
      const aValue = getNestedValue(a, key);
      const bValue = getNestedValue(b, key);
      const isNumeric =
        aValue != null &&
        bValue != null &&
        aValue !== '' &&
        bValue !== '' &&
        !isNaN(Number(aValue)) &&
        !isNaN(Number(bValue));

      const comparison = isNumeric
        ? Number(aValue) - Number(bValue)
        : String(aValue ?? '').toLowerCase().localeCompare(String(bValue ?? '').toLowerCase());

      return direction === 'asc' ? comparison : -comparison;
    });
  }, [items, sortConfig]);
}
