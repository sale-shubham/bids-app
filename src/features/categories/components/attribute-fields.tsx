'use client';
import * as React from 'react';
import { FormInput } from '@/components/common/form-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AttributeDef } from '../categories.types';

/** Dynamic fields for a category's attribute schema (text / number / select, required marks, unit suffix). */
export function AttributeFields({
  defs,
  values,
  onChange,
  errors,
}: {
  defs: AttributeDef[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  errors?: Record<string, string | undefined>;
}) {
  if (defs.length === 0) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2" data-testid="attribute-fields">
      {defs.map((d) => {
        const label = d.unit ? `${d.label} (${d.unit})` : d.label;
        const err = errors?.[d.key];
        if (d.type === 'select') {
          return (
            <div key={d.key} className="space-y-1.5">
              <Label>
                {label} {d.required && <span className="text-destructive">*</span>}
              </Label>
              <Select value={values[d.key] ?? ''} onValueChange={(v) => onChange(d.key, v)}>
                <SelectTrigger aria-label={label} aria-invalid={!!err} onClear={!d.required && values[d.key] ? () => onChange(d.key, '') : undefined}>
                  <SelectValue placeholder="Choose" />
                </SelectTrigger>
                <SelectContent>
                  {(d.options ?? []).map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {err && <p className="text-xs text-destructive">{err}</p>}
            </div>
          );
        }
        return (
          <FormInput
            key={d.key}
            label={label}
            required={d.required}
            type={d.type === 'number' ? 'number' : 'text'}
            inputMode={d.type === 'number' ? 'decimal' : undefined}
            step={d.type === 'number' ? 'any' : undefined}
            maxLength={d.type === 'text' ? 200 : undefined}
            value={values[d.key] ?? ''}
            onChange={(e) => onChange(d.key, e.target.value)}
            error={err}
          />
        );
      })}
    </div>
  );
}
