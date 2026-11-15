'use client';
import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { FormInput } from '@/components/common/form-input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { categoryDefaults, categoryFormSchema, toCategoryPayload, type CategoryFormValues } from '../categories.schema';
import { categoryErrorMessage } from '../categories.errors';
import type { AdminCategory } from '../categories.types';
import { adminTreeRows, selfAndDescendantIds } from '../categories.utils';
import { useCreateCategory, useUpdateCategory } from '../use-categories';
import { AttributeSchemaEditor } from './attribute-schema-editor';

const ROOT = '__root__';

/** Create (`category` undefined) or edit a category. `rows` is the flat admin list (parent options). */
export function CategoryDialog({
  open,
  onOpenChange,
  category,
  rows,
  defaultParentId = '',
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  category?: AdminCategory;
  rows: AdminCategory[];
  defaultParentId?: string;
}) {
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const defaults = React.useMemo(() => categoryDefaults(category, defaultParentId), [category, defaultParentId]);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormValues>({ resolver: zodResolver(categoryFormSchema), defaultValues: defaults });
  const attributes = useWatch({ control, name: 'attributes' });
  const types = (attributes ?? []).map((a) => a.type);

  React.useEffect(() => {
    if (open) reset(defaults);
  }, [open, defaults, reset]);

  // A category cannot become its own child: hide itself and everything below it.
  const excluded = React.useMemo(() => (category ? selfAndDescendantIds(rows, category.id) : new Set<string>()), [rows, category]);
  const parentOptions = React.useMemo(() => adminTreeRows(rows).filter((r) => !excluded.has(r.node.id)), [rows, excluded]);

  const pending = create.isPending || update.isPending;
  const onSubmit = (v: CategoryFormValues) => {
    const payload = toCategoryPayload(v);
    const handlers = {
      onSuccess: () => {
        toast.success(category ? 'Category updated' : 'Category created');
        onOpenChange(false);
      },
      onError: (e: unknown) => toast.error(categoryErrorMessage(e, 'Could not save the category')),
    };
    if (category) update.mutate({ id: category.id, ...payload }, handlers);
    else create.mutate(payload, handlers);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{category ? 'Edit category' : 'New category'}</DialogTitle>
          <DialogDescription>Categories form a tree. Attributes describe the details sellers fill in for this kind of item.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput label="Name" required maxLength={60} error={errors.name?.message} {...register('name')} />
            <FormInput label="Slug" hint="Optional. Generated from the name when empty." maxLength={60} error={errors.slug?.message} {...register('slug')} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Parent</Label>
              <Controller
                control={control}
                name="parentId"
                render={({ field }) => (
                  <Select value={field.value || ROOT} onValueChange={(v) => field.onChange(v === ROOT ? '' : v)}>
                    <SelectTrigger aria-label="Parent category">
                      <SelectValue placeholder="Top level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ROOT}>Top level</SelectItem>
                      {parentOptions.map(({ node, depth }) => (
                        <SelectItem key={node.id} value={node.id} textValue={node.name}>
                          <span style={{ paddingLeft: `${depth * 12}px` }}>{node.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <FormInput label="Sort order" inputMode="numeric" hint="Lower comes first." error={errors.sortOrder?.message} {...register('sortOrder')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category-description">Description</Label>
            <Textarea id="category-description" rows={2} maxLength={300} aria-invalid={!!errors.description} {...register('description')} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>
          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <div className="flex items-center gap-3">
                <Switch id="category-active" checked={field.value} onCheckedChange={field.onChange} />
                <Label htmlFor="category-active">Active (sellers can list in it)</Label>
              </div>
            )}
          />
          <AttributeSchemaEditor control={control} register={register} errors={errors} watchTypes={types} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {category ? 'Save changes' : 'Create category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
