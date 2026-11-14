'use client';
import * as React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { SortConfig } from '@/components/common/use-sortable-data';

interface SortableTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortKey: string;
  sortConfig: SortConfig | null;
  onSort: (key: string) => void;
}

/** Clickable `<TableHead>` with an asc/desc indicator. Pairs with `useSortableData`. */
export function SortableTableHead({ sortKey, sortConfig, onSort, className, children, ...props }: SortableTableHeadProps) {
  const active = sortConfig?.key === sortKey;

  return (
    <TableHead
      className={cn('cursor-pointer select-none whitespace-nowrap', className)}
      onClick={() => onSort(sortKey)}
      aria-sort={active ? (sortConfig!.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      {...props}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {active &&
          (sortConfig!.direction === 'asc' ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          ))}
      </span>
    </TableHead>
  );
}
