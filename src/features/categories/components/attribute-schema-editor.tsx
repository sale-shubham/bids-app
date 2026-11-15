'use client';
import * as React from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Controller, useFieldArray, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { FormInput } from '@/components/common/form-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { emptyAttributeRow, type CategoryFormValues } from '../categories.schema';
import type { AttributeType } from '../categories.types';

const TYPE_OPTIONS: { value: AttributeType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Select (choose one)' },
];

/** Rows editor for a category's attribute schema: key, label, type, options (select), required, unit; reorderable. */
export function AttributeSchemaEditor({
  control,
  register,
  errors,
  watchTypes,
}: {
  control: Control<CategoryFormValues>;
  register: UseFormRegister<CategoryFormValues>;
  errors: FieldErrors<CategoryFormValues>;
  /** Current type of each row (so `select` rows show the options field). */
  watchTypes: AttributeType[];
}) {
  const { fields, append, remove, move } = useFieldArray({ control, name: 'attributes' });
  const rowErrors = errors.attributes;
  const listError = typeof rowErrors?.message === 'string' ? rowErrors.message : rowErrors?.root?.message;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Attributes</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => append(emptyAttributeRow())}>
          <Plus className="h-4 w-4" /> Add attribute
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Extra details sellers fill in for items in this category (shown as specifications and, for select types, as browse filters).</p>
      {fields.length === 0 && <p className="rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground">No attributes yet.</p>}
      <ul className="space-y-3">
        {fields.map((f, i) => {
          const e = Array.isArray(rowErrors) ? rowErrors[i] : undefined;
          return (
            <li key={f.id} className="space-y-3 rounded-lg border p-3" data-testid="attribute-row">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormInput label="Key" placeholder="e.g. screen_size" error={e?.key?.message} {...register(`attributes.${i}.key`)} />
                <FormInput label="Label" placeholder="e.g. Screen size" error={e?.label?.message} {...register(`attributes.${i}.label`)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Controller
                    control={control}
                    name={`attributes.${i}.type`}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger aria-label={`Type of attribute ${i + 1}`}>
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {TYPE_OPTIONS.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <FormInput label="Unit" placeholder="e.g. cm" maxLength={20} error={e?.unit?.message} {...register(`attributes.${i}.unit`)} />
              </div>
              {watchTypes[i] === 'select' && (
                <FormInput label="Options" placeholder="Comma separated, e.g. Small, Medium, Large" error={e?.options?.message} {...register(`attributes.${i}.options`)} />
              )}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Controller
                  control={control}
                  name={`attributes.${i}.required`}
                  render={({ field }) => (
                    <div className="flex items-center gap-2">
                      <Switch id={`attr-required-${f.id}`} checked={field.value} onCheckedChange={field.onChange} />
                      <Label htmlFor={`attr-required-${f.id}`} className="font-normal">
                        Required
                      </Label>
                    </div>
                  )}
                />
                <div className="flex gap-1">
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label={`Move attribute ${i + 1} up`}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={i === fields.length - 1} onClick={() => move(i, i + 1)} aria-label={`Move attribute ${i + 1} down`}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(i)} aria-label={`Remove attribute ${i + 1}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {listError && <p className="text-xs text-destructive">{listError}</p>}
    </div>
  );
}
