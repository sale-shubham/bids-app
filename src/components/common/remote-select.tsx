'use client';
import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  optionId,
  revealOption,
  SelectClearControl,
  selectContentClass,
  selectItemClass,
  selectTriggerClass,
} from '@/components/ui/select';

// Searchable dropdown whose options come from the API. Same look and keyboard
// behaviour as `ui/select`, but the search box sends `?q=` to the server
// (debounced), the list is paged 25 at a time and the next page loads when
// the list is scrolled to the bottom. Nothing is ever loaded "all at once" —
// see docs/PAGINATION.md "Pickers". Constant, hardcoded option lists stay on
// `ui/select`.

export const REMOTE_SELECT_PAGE_SIZE = 25;
const DEBOUNCE_MS = 300;

export interface RemotePage<T> {
  rows: T[];
  total: number;
}

export interface RemoteSelectLeadingOption {
  value: string;
  label: string;
}

export interface RemoteSelectProps<T> {
  /** Selected value; '' = none. */
  value: string;
  /** Fires with the picked value and its full record (null for a leading option / clear). */
  onChange: (value: string, record: T | null) => void;
  /**
   * Cache prefix for this picker, e.g. `['admin-members']`-style prefix of the
   * entity (docs/PAGINATION.md). Lists are cached under `[...queryKey, 'search', …]`,
   * the label lookup under `[...queryKey, 'selected', id]`. Anything that changes
   * the result set besides `q` (filters, `excludeIds`) MUST be part of it.
   */
  queryKey: readonly unknown[];
  /** One server page. `q` may be ''. */
  fetchPage: (params: { q: string; page: number; pageSize: number }) => Promise<RemotePage<T>>;
  getValue: (record: T) => string;
  getLabel: (record: T) => string;
  /** Custom row content (e.g. name + mobile). Defaults to the label. */
  renderOption?: (record: T) => React.ReactNode;
  /** Record for `value` when the caller already has it (edit forms). */
  selected?: T | null;
  /** Label lookup for a `value` that is not in a loaded page (URL-seeded filters). */
  fetchSelected?: (id: string) => Promise<T | null>;
  /** Fixed sentinel rows shown first ("All members"). Matched against the typed text client-side. */
  leadingOptions?: RemoteSelectLeadingOption[];
  placeholder?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  /** Shows the × control while a value is set (it calls `onChange('', null)` or `onClear`). */
  clearable?: boolean;
  onClear?: () => void;
  pageSize?: number;
  id?: string;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
}

interface OptionRow<T> {
  value: string;
  label: string;
  record: T | null;
}

export function RemoteSelect<T>({
  value,
  onChange,
  queryKey,
  fetchPage,
  getValue,
  getLabel,
  renderOption,
  selected,
  fetchSelected,
  leadingOptions,
  placeholder,
  disabled,
  className,
  clearable,
  onClear,
  pageSize = REMOTE_SELECT_PAGE_SIZE,
  id,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
}: RemoteSelectProps<T>) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  // The query actually sent to the server — `query` after 300ms of no typing.
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const [activeValue, setActiveValue] = React.useState<string | null>(null);
  // Last record picked in this component, so the trigger can show its label
  // without a lookup request.
  const [picked, setPicked] = React.useState<T | null>(null);
  const pointerTypeRef = React.useRef('');
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listboxId = React.useId();

  // Debounce: setState runs in the timer callback, never synchronously in the effect.
  React.useEffect(() => {
    if (query === debouncedQuery) return;
    const t = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, debouncedQuery]);

  const q = debouncedQuery.trim();
  const list = useInfiniteQuery({
    queryKey: [...queryKey, 'search', { q, pageSize }],
    queryFn: async ({ pageParam }) => {
      const res = await fetchPage({ q, page: pageParam, pageSize });
      return { ...res, page: pageParam };
    },
    initialPageParam: 1,
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.rows.length, 0);
      return last.rows.length > 0 && loaded < last.total ? last.page + 1 : undefined;
    },
    enabled: open,
    placeholderData: keepPreviousData,
  });

  const rows = React.useMemo(() => list.data?.pages.flatMap((p) => p.rows) ?? [], [list.data]);
  const total = list.data?.pages[0]?.total ?? 0;

  const leading = leadingOptions?.find((o) => o.value === value);
  const known =
    value === '' || leading
      ? null
      : selected && getValue(selected) === value
        ? selected
        : picked && getValue(picked) === value
          ? picked
          : (rows.find((r) => getValue(r) === value) ?? null);
  const lookup = useQuery({
    queryKey: [...queryKey, 'selected', value],
    queryFn: () => fetchSelected!(value),
    enabled: !!fetchSelected && value !== '' && !leading && !known,
  });
  const record = known ?? lookup.data ?? null;
  const triggerLabel = value === '' ? null : leading ? leading.label : record ? getLabel(record) : null;

  const options: OptionRow<T>[] = [
    ...(leadingOptions ?? [])
      .filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
      .map((o) => ({ value: o.value, label: o.label, record: null })),
    ...rows.map((r) => ({ value: getValue(r), label: getLabel(r), record: r })),
  ];
  // Falls back to the first row when the highlighted one is gone after a new search.
  const active = options.some((o) => o.value === activeValue) ? activeValue : (options[0]?.value ?? null);

  const openWith = (initial: string) => {
    setQuery(initial);
    setDebouncedQuery(initial);
    setActiveValue(initial ? null : value || null);
    setOpen(true);
  };

  const choose = (opt: OptionRow<T>) => {
    if (opt.value !== value) {
      setPicked(opt.record);
      onChange(opt.value, opt.record);
    }
    setOpen(false);
  };

  const moveActive = (step: 1 | -1) => {
    if (!options.length) return;
    const index = options.findIndex((o) => o.value === active);
    const nextIndex = index === -1 ? (step === 1 ? 0 : options.length - 1) : Math.min(Math.max(index + step, 0), options.length - 1);
    // Keyboard past the last loaded row pulls the next page.
    if (step === 1 && index === options.length - 1 && list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
    const next = options[nextIndex];
    setActiveValue(next.value);
    revealOption(optionId(listboxId, next.value));
  };

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 48 && list.hasNextPage && !list.isFetchingNextPage) {
      void list.fetchNextPage();
    }
  };

  const initialLoading = open && list.isPending;
  const stale = list.isPlaceholderData;
  const nextPageFailed = list.isFetchNextPageError;
  const clear = clearable || onClear ? () => (onClear ? onClear() : onChange('', null)) : undefined;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={(next) => (next ? openWith('') : setOpen(false))} modal>
      <PopoverPrimitive.Trigger
        id={id}
        role="combobox"
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-haspopup="listbox"
        disabled={disabled}
        className={cn(selectTriggerClass, className)}
        onPointerDown={(e) => {
          pointerTypeRef.current = e.pointerType;
        }}
        onKeyDown={(e) => {
          pointerTypeRef.current = 'keyboard';
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            openWith('');
          } else if (e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            // Typing on the closed trigger opens it and starts the search.
            e.preventDefault();
            openWith(e.key);
          }
        }}
      >
        <span className="pointer-events-none">{triggerLabel ?? placeholder}</span>
        <span className="flex shrink-0 items-center gap-0.5 pl-1">
          {clear && value !== '' && !disabled && <SelectClearControl onClear={clear} />}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </span>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className={selectContentClass}
          onOpenAutoFocus={(e) => {
            // Same as ui/select: caret at the end of the search box, and no
            // on-screen keyboard on touch.
            e.preventDefault();
            const input = inputRef.current;
            if (pointerTypeRef.current === 'touch' || !input) {
              (e.currentTarget as HTMLElement | null)?.focus({ preventScroll: true });
            } else {
              input.focus({ preventScroll: true });
              input.setSelectionRange(input.value.length, input.value.length);
            }
          }}
        >
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              role="combobox"
              aria-label="Search options"
              aria-expanded
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={active !== null ? optionId(listboxId, active) : undefined}
              autoComplete="off"
              spellCheck={false}
              placeholder="Search..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveValue(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  moveActive(e.key === 'ArrowDown' ? 1 : -1);
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  const opt = options.find((o) => o.value === active);
                  if (opt) choose(opt);
                }
              }}
              className="h-10 w-full min-w-0 bg-transparent text-sm outline-hidden placeholder:text-muted-foreground"
            />
            {(initialLoading || stale || list.isFetching) && !list.isFetchingNextPage && (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
            )}
          </div>
          <div
            id={listboxId}
            role="listbox"
            onScroll={onScroll}
            className={cn('relative max-h-72 overflow-y-auto p-1', stale && 'opacity-60')}
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              const isActive = opt.value === active;
              return (
                <div
                  key={opt.value}
                  id={optionId(listboxId, opt.value)}
                  role="option"
                  aria-selected={isSelected}
                  data-active={isActive ? '' : undefined}
                  className={selectItemClass}
                  onPointerMove={() => {
                    if (!isActive) setActiveValue(opt.value);
                  }}
                  onClick={() => choose(opt)}
                >
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    {isSelected && <Check className="h-4 w-4" />}
                  </span>
                  {opt.record && renderOption ? renderOption(opt.record) : opt.label}
                </div>
              );
            })}
            {initialLoading && !options.length && (
              <p role="status" className="py-6 text-center text-sm text-muted-foreground">
                Loading...
              </p>
            )}
            {list.isError && !rows.length && (
              <div className="flex flex-col items-center gap-2 py-6 text-sm text-muted-foreground">
                <p>Couldn&apos;t load options.</p>
                <button
                  type="button"
                  onClick={() => void list.refetch()}
                  className="rounded-md border px-2 py-1 text-xs text-foreground hover:bg-accent"
                >
                  Retry
                </button>
              </div>
            )}
            {!initialLoading && !list.isError && !options.length && (
              <p className="py-6 text-center text-sm text-muted-foreground">No results found.</p>
            )}
            {list.isFetchingNextPage && (
              <p role="status" className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Loading more...
              </p>
            )}
            {nextPageFailed && (
              <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
                <span>Couldn&apos;t load more.</span>
                <button
                  type="button"
                  onClick={() => void list.fetchNextPage()}
                  className="rounded-md border px-2 py-0.5 text-foreground hover:bg-accent"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
          {total > 0 && (
            <p className="border-t px-3 py-1.5 text-xs text-muted-foreground" aria-live="polite">
              {rows.length} of {total}
            </p>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
