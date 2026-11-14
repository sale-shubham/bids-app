import * as React from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

/** Default rows-per-page choices for the selector. */
export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 75, 100];

interface ListPaginationProps {
  total: number;
  pageSize: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  /** Provide to show the rows-per-page selector; omit for nav only. */
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  hideOnSinglePage?: boolean;
  className?: string;
}

/**
 * Right-aligned pagination bar: a rows-per-page selector + the shadcn
 * `ui/pagination` nav (Previous / numbered pages / Next). Offset-style.
 */
export const ListPagination: React.FC<ListPaginationProps> = ({
  total,
  pageSize,
  currentPage,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  hideOnSinglePage = false,
  className,
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const showSizeSelect = Boolean(onPageSizeChange);
  const showNav = !(hideOnSinglePage && totalPages <= 1);

  if (!showSizeSelect && !showNav) return null;

  const goTo = (page: number) => {
    const clamped = Math.min(Math.max(1, page), totalPages);
    if (clamped !== currentPage) onPageChange(clamped);
  };

  const options = Array.from(new Set([...pageSizeOptions, pageSize])).sort((a, b) => a - b);
  const pages = buildPageWindow(currentPage, totalPages);

  return (
    <div
      className={cn(
        'flex flex-row flex-wrap items-center justify-between gap-x-4 gap-y-3 @lg/content:justify-end @lg/content:gap-6',
        className
      )}
    >
      {showSizeSelect && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="whitespace-nowrap">Rows per page</span>
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange?.(Number(v))}>
            <SelectTrigger
              className="h-8 w-auto gap-1 border-border bg-muted px-2 text-sm text-foreground"
              aria-label="Rows per page"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt} value={String(opt)}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showNav && (
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={currentPage <= 1}
                tabIndex={currentPage <= 1 ? -1 : undefined}
                className={cn('size-9', currentPage <= 1 && 'pointer-events-none opacity-50')}
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) goTo(currentPage - 1);
                }}
              />
            </PaginationItem>

            {pages.map((entry, idx) =>
              entry === 'ellipsis' ? (
                <PaginationItem key={`ellipsis-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={entry}>
                  <PaginationLink
                    href="#"
                    isActive={entry === currentPage}
                    className={cn(
                      'size-9',
                      entry === currentPage &&
                        'border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      goTo(entry);
                    }}
                  >
                    {entry}
                  </PaginationLink>
                </PaginationItem>
              )
            )}

            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={currentPage >= totalPages}
                tabIndex={currentPage >= totalPages ? -1 : undefined}
                className={cn('size-9', currentPage >= totalPages && 'pointer-events-none opacity-50')}
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) goTo(currentPage + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

type PageEntry = number | 'ellipsis';

function buildPageWindow(current: number, total: number): PageEntry[] {
  // Small counts fit without ellipsis (first + last + ±2 window = up to 9 cells).
  if (total <= 9) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const window: PageEntry[] = [1];
  const start = Math.max(2, current - 2);
  const end = Math.min(total - 1, current + 2);
  if (start > 2) window.push('ellipsis');
  for (let i = start; i <= end; i++) window.push(i);
  if (end < total - 1) window.push('ellipsis');
  window.push(total);
  return window;
}

export default ListPagination;
