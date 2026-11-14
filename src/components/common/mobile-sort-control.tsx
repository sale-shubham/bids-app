'use client';
import * as React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TooltipIconButton } from '@/components/common/tooltip-icon-button';
import { cn } from '@/lib/utils';
import type { SortConfig } from '@/components/common/use-sortable-data';

export interface SortColumn {
  key: string;
  label: string;
}

interface MobileSortControlProps {
  columns: SortColumn[];
  sortConfig: SortConfig | null;
  onSort: (key: string) => void;
  className?: string;
}

/**
 * Cards-only counterpart to `SortableTableHead` (`@3xl/content:hidden`, the
 * same content-box switch as `ResponsiveList` — wherever the cards replace the
 * table, its clickable headers aren't on screen, phone or narrow desktop). A
 * `<Select>` picks the column, an icon button flips direction — both drive
 * the SAME `sortConfig`/`onSort` the page's desktop table uses, so mobile and
 * desktop always agree on the active sort. Re-clicking the already-selected
 * column via `onSort(sortConfig.key)` is exactly how `useSortState`'s
 * `requestSort` toggles asc→desc, so the direction button needs no separate
 * state of its own.
 */
export function MobileSortControl({ columns, sortConfig, onSort, className }: MobileSortControlProps) {
  const active = columns.find((c) => c.key === sortConfig?.key);

  return (
    <div className={cn('flex items-center gap-2 @3xl/content:hidden', className)}>
      <Select value={sortConfig?.key ?? ''} onValueChange={onSort}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Sort by">{active ? `Sort: ${active.label}` : 'Sort by'}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {columns.map((c) => (
            <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <TooltipIconButton
        label={!sortConfig ? 'Select a column first' : sortConfig.direction === 'asc' ? 'Ascending — tap for descending' : 'Descending — tap for ascending'}
        variant="outline"
        size="icon"
        disabled={!sortConfig}
        onClick={() => sortConfig && onSort(sortConfig.key)}
        className="shrink-0"
      >
        {!sortConfig ? <ArrowUpDown className="h-4 w-4" /> : sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
      </TooltipIconButton>
    </div>
  );
}
