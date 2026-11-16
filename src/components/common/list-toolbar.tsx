'use client';
import * as React from 'react';
import { ListFilter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

/**
 * The one row above a list: tabs on the left, search and a **Filters** button
 * on the right. The Filters button opens a panel below with the remaining
 * controls (selects, dates) and *Clear filters* while any is set. The button
 * counts the filters that are set.
 *
 * Narrow: the tabs take their own row and scroll sideways; search + Filters
 * share the next row. Switches on the container (`@3xl/content`), not the window.
 *
 * Filter state lives in the URL (`useUrlState`), not here. This component only
 * owns whether the panel is open; it starts open when a filter is already set
 * (a shared link) so the active filter is visible. Search and tabs are not
 * counted in `activeFilters`; pass only the panel's own filters. Put
 * `<SearchInput>` in `search`, `<StatusTabs>` in `tabs`, `<FilterSelect>`s as
 * children. No children, no Filters button.
 */
export function ListToolbar({
  tabs,
  search,
  activeFilters = 0,
  onClearFilters,
  children,
}: {
  tabs?: React.ReactNode;
  search?: React.ReactNode;
  activeFilters?: number;
  onClearFilters?: () => void;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(activeFilters > 0);
  const panelId = React.useId();
  const hasPanel = React.Children.toArray(children).some(Boolean);

  return (
    <div role="group" aria-label="Filters" className="space-y-3">
      <div className="flex flex-col gap-2 @3xl/content:flex-row @3xl/content:items-center @3xl/content:gap-3">
        {tabs && (
          <div
            className={cn(
              'min-w-0 overflow-x-auto [scrollbar-width:none] @3xl/content:shrink-0',
              '[&_[role=tablist]]:w-max [&_[role=tablist]]:flex-nowrap',
              '[&_[role=tab]]:px-2.5 @lg/content:[&_[role=tab]]:px-3',
            )}
          >
            {tabs}
          </div>
        )}
        {(search || hasPanel) && (
          <div
            className={cn(
              'flex min-w-0 items-center gap-2 @3xl/content:ml-auto',
              search ? '@3xl/content:w-full @3xl/content:max-w-md' : 'justify-end',
            )}
          >
            {search && <div className="min-w-0 flex-1">{search}</div>}
            {hasPanel && (
              <Button
                variant="outline"
                className="shrink-0"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-controls={panelId}
              >
                <ListFilter className="h-4 w-4" />
                Filters
                {activeFilters > 0 && (
                  <span className="rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground tnum">
                    {activeFilters}
                  </span>
                )}
              </Button>
            )}
          </div>
        )}
      </div>

      {hasPanel && open && (
        <div
          id={panelId}
          className="grid gap-3 rounded-lg border bg-muted/30 p-3 @lg/content:grid-cols-2 @3xl/content:flex @3xl/content:flex-wrap @3xl/content:items-center"
        >
          {children}
          {activeFilters > 0 && onClearFilters && (
            <Button variant="ghost" size="sm" className="justify-self-start" onClick={onClearFilters}>
              <X className="h-4 w-4" /> Clear filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

const ALL = '__all__';

/**
 * A select filter bound to a URL param value. `value` is `''` for "no filter";
 * with `includeAll` (default) the all-option is listed and `onChange` receives
 * `''` for it, so it drops out of the URL. With `includeAll={false}` there is
 * no all-option: pass a `value` that is always one of `options`.
 */
export function FilterSelect({
  value,
  onChange,
  options,
  allLabel,
  includeAll = true,
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  /** Label of the unfiltered option, e.g. "All roles". Required when `includeAll` is true. */
  allLabel?: string;
  /** Whether the unfiltered "all" option is listed. Default `true`. */
  includeAll?: boolean;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <Select value={includeAll ? value || ALL : value} onValueChange={(v) => onChange(includeAll && v === ALL ? '' : v)}>
      <SelectTrigger className={cn('w-full @3xl/content:w-48', className)} aria-label={ariaLabel}>
        <SelectValue placeholder={allLabel} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && <SelectItem value={ALL}>{allLabel}</SelectItem>}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
