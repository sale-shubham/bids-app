'use client';
import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SearchInput } from '@/components/common/search-input';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { SaveSearchButton } from '@/features/saved-searches/components/save-search-button';
import { BROWSE_STATUSES, DEFAULT_FILTERS, SORT_OPTIONS, filtersToSearchParams, parseFilters } from '../auctions.filters';
import { useCategories } from '../use-auctions';
import type { AuctionFilters, AuctionSort, BrowseStatus } from '../auctions.types';

// Filter bar for /auctions. The URL is the source of truth: every change is a
// router.replace of the search params, which re-renders the server page (fresh
// first page for SEO) and the client list with the new filters.
export function AuctionFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const filters = parseFilters(search);
  const categories = useCategories();

  const update = (patch: Partial<AuctionFilters>) => {
    const qs = filtersToSearchParams({ ...filters, ...patch }).toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const commitPrice = (key: 'minPrice' | 'maxPrice') => (e: React.FocusEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>) => {
    if ('key' in e && e.key !== 'Enter') return;
    const raw = e.currentTarget.value.trim();
    const n = Number(raw);
    const next = raw !== '' && Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
    if (next !== filters[key]) update({ [key]: next });
  };

  const dirty = filters.q || filters.category || filters.condition || filters.minPrice !== undefined || filters.maxPrice !== undefined;

  return (
    <div className="space-y-3">
      <Tabs value={filters.status} onValueChange={(v) => update({ status: v as BrowseStatus })}>
        <TabsList>
          {BROWSE_STATUSES.map((s) => (
            <TabsTrigger key={s.value} value={s.value}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-2 gap-3 @2xl/content:grid-cols-6">
        <SearchInput
          className="col-span-2 @2xl/content:col-span-2"
          value={filters.q}
          onChange={(q) => update({ q })}
          placeholder="Search auctions"
          aria-label="Search auctions"
        />
        <Select value={filters.category} onValueChange={(v) => update({ category: v })}>
          <SelectTrigger aria-label="Category" onClear={filters.category ? () => update({ category: '' }) : undefined}>
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            {(categories.data ?? []).map((c) => (
              <SelectItem key={c.name} value={c.name}>
                {c.name} ({c.liveCount})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.condition} onValueChange={(v) => update({ condition: v === 'NEW' || v === 'USED' ? v : '' })}>
          <SelectTrigger aria-label="Condition" onClear={filters.condition ? () => update({ condition: '' }) : undefined}>
            <SelectValue placeholder="Any condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NEW">New</SelectItem>
            <SelectItem value="USED">Used</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.sort} onValueChange={(v) => update({ sort: v as AuctionSort })}>
          <SelectTrigger aria-label="Sort by">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="col-span-2 flex items-center gap-2 @2xl/content:col-span-1">
          <Input
            key={`min-${filters.minPrice ?? ''}`}
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Min ₹"
            aria-label="Minimum price in rupees"
            defaultValue={filters.minPrice ?? ''}
            onBlur={commitPrice('minPrice')}
            onKeyDown={commitPrice('minPrice')}
          />
          <span className="text-muted-foreground">–</span>
          <Input
            key={`max-${filters.maxPrice ?? ''}`}
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Max ₹"
            aria-label="Maximum price in rupees"
            defaultValue={filters.maxPrice ?? ''}
            onBlur={commitPrice('maxPrice')}
            onKeyDown={commitPrice('maxPrice')}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SaveSearchButton filters={filters} />
        {dirty && (
          <Button type="button" variant="ghost" size="sm" onClick={() => update({ ...DEFAULT_FILTERS, status: filters.status, sort: filters.sort, minPrice: undefined, maxPrice: undefined })}>
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
