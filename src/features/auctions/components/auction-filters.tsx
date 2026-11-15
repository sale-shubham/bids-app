'use client';
import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SearchInput } from '@/components/common/search-input';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SaveSearchButton } from '@/features/saved-searches/components/save-search-button';
import { BROWSE_STATUSES, DEFAULT_FILTERS, SORT_OPTIONS, filtersToSearchParams, parseFilters } from '../auctions.filters';
import { findBySlug, flattenTree } from '@/features/categories/categories.utils';
import { useCategoryTree } from '@/features/categories/use-categories';
import { CONDITIONS, type AuctionCondition, type AuctionFilters, type AuctionSort, type BrowseStatus } from '../auctions.types';

/** At most this many of the category's select-type attributes get a filter. */
const MAX_ATTR_SELECTS = 3;

// Filter bar for /auctions. The URL is the source of truth: every change is a
// router.replace of the search params, which re-renders the server page (fresh
// first page for SEO) and the client list with the new filters.
export function AuctionFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const filters = parseFilters(search);
  const categories = useCategoryTree();
  const tree = React.useMemo(() => categories.data ?? [], [categories.data]);
  const flat = React.useMemo(() => flattenTree(tree), [tree]);
  const chosen = filters.category ? findBySlug(tree, filters.category) : undefined;
  const attrDefs = (chosen?.attributeSchema ?? []).filter((d) => d.type === 'select' && (d.options?.length ?? 0) > 0).slice(0, MAX_ATTR_SELECTS);
  const setAttr = (key: string, value: string) => {
    const next = { ...(filters.attrs ?? {}) };
    if (value) next[key] = value;
    else delete next[key];
    update({ attrs: Object.keys(next).length ? next : undefined });
  };

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

  const dirty = filters.q || filters.category || filters.condition || filters.attrs || filters.minPrice !== undefined || filters.maxPrice !== undefined || filters.verified;

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
        {/* Category by slug; picking one also covers its subcategories. Attribute filters belong to one category, so they reset. */}
        <Select value={filters.category} onValueChange={(v) => update({ category: v, attrs: undefined })}>
          <SelectTrigger aria-label="Category" onClear={filters.category ? () => update({ category: '', attrs: undefined }) : undefined}>
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            {flat.map(({ node, depth }) => (
              <SelectItem key={node.id} value={node.slug} textValue={node.name}>
                <span style={{ paddingLeft: `${depth * 12}px` }}>
                  {node.name} ({node.liveCount})
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.condition} onValueChange={(v) => update({ condition: (CONDITIONS.find((c) => c.value === v)?.value ?? '') as '' | AuctionCondition })}>
          <SelectTrigger aria-label="Condition" onClear={filters.condition ? () => update({ condition: '' }) : undefined}>
            <SelectValue placeholder="Any condition" />
          </SelectTrigger>
          <SelectContent>
            {CONDITIONS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
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

      {attrDefs.length > 0 && (
        <div className="grid grid-cols-2 gap-3 @2xl/content:grid-cols-6" data-testid="attr-filters">
          {attrDefs.map((d) => (
            <Select key={d.key} value={filters.attrs?.[d.key] ?? ''} onValueChange={(v) => setAttr(d.key, v)}>
              <SelectTrigger aria-label={d.label} onClear={filters.attrs?.[d.key] ? () => setAttr(d.key, '') : undefined}>
                <SelectValue placeholder={`Any ${d.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {(d.options ?? []).map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Switch id="verified-only" checked={!!filters.verified} onCheckedChange={(v) => update({ verified: v || undefined })} />
          <Label htmlFor="verified-only" className="text-sm font-normal">
            Verified sellers only
          </Label>
        </div>
        <SaveSearchButton filters={filters} />
        {dirty && (
          <Button type="button" variant="ghost" size="sm" onClick={() => update({ ...DEFAULT_FILTERS, status: filters.status, sort: filters.sort, attrs: undefined, minPrice: undefined, maxPrice: undefined, verified: undefined })}>
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
