'use client';
import * as React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { findById, pathTo, pickerLevels } from '../categories.utils';
import type { CategoryNode } from '../categories.types';

/**
 * Cascading category picker: root select, then one more select for each level that has children.
 * `value` is a category id (any level). Choosing a parent clears everything below it.
 */
export function CategoryPicker({
  tree,
  value,
  onChange,
  error,
  loading,
}: {
  tree: CategoryNode[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
  loading?: boolean;
}) {
  // A saved category that is no longer in the tree (deactivated): keep showing it so the form stays valid.
  const known = !value || findById(tree, value);
  const levels = pickerLevels(tree, known ? value : '');
  const path = value ? pathTo(tree, value) : [];

  return (
    <div className="space-y-1.5">
      <Label>
        Category <span className="text-destructive">*</span>
      </Label>
      <div className="grid gap-2 sm:grid-cols-2">
        {levels.map((lvl, i) => (
          <Select key={i} value={lvl.value} onValueChange={(id) => onChange(id)} disabled={loading}>
            <SelectTrigger aria-label={i === 0 ? 'Category' : `Subcategory level ${i}`} aria-invalid={!!error && i === 0}>
              <SelectValue placeholder={i === 0 ? (loading ? 'Loading…' : 'Choose a category') : 'Choose a subcategory'} />
            </SelectTrigger>
            <SelectContent>
              {lvl.options.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>
      {path.length > 1 && <p className="text-xs text-muted-foreground">{path.map((p) => p.name).join(' › ')}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
