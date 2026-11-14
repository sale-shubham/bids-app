'use client';
import * as React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  /** Committed value (the query actually sent upstream). */
  value: string;
  /** Fired after `debounceMs` of no typing, or immediately on clear. */
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
  'aria-label'?: string;
}

/**
 * Debounced free-text search box (Search icon + clear button), styled with the
 * app's `Input`. Keeps its own immediate local state for a responsive field and
 * emits the debounced value to `onChange` — callers pass that to their `q` query
 * param and reset the page to 1 (see docs/PAGINATION.md).
 */
export function SearchInput({
  value,
  onChange,
  placeholder = '',
  debounceMs = 500,
  className,
  'aria-label': ariaLabel = 'Search',
}: SearchInputProps) {
  const [local, setLocal] = React.useState(value);

  // Keep the field in sync when the committed value changes externally (e.g.
  // reset) — adjusted during render rather than in an effect.
  const [prevValue, setPrevValue] = React.useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setLocal(value);
  }

  // Debounce-emit local edits; skip when already equal to avoid redundant fetches.
  React.useEffect(() => {
    if (local === value) return;
    const t = setTimeout(() => onChange(local), debounceMs);
    return () => clearTimeout(t);
  }, [local, value, onChange, debounceMs]);

  const clear = () => { setLocal(''); onChange(''); };

  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        className="pl-9 pr-9"
        placeholder={placeholder}
        aria-label={ariaLabel}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
      />
      {local && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={clear}
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
