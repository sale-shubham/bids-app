'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { AssetImage } from '@/components/common/asset-image';
import { DatePicker } from '@/components/common/date-picker';
import { FormInput } from '@/components/common/form-input';
import { Notice } from '@/components/common/notice';
import { RichTextEditor } from '@/components/common/rich-text-editor';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { apiErrorCode } from '@/lib/api-client';
import { cn, formatINR } from '@/lib/utils';
import { useMaxPricePaise } from '@/features/settings/use-settings';
import { legalPagePath } from '@/constants/legal';
import { useAuthStore } from '@/store/auth-store';
import { AttributeFields } from '@/features/categories/components/attribute-fields';
import { CategoryPicker } from '@/features/categories/components/category-picker';
import { attributeSchemaFor } from '@/features/categories/categories.utils';
import { useCategoryTree } from '@/features/categories/use-categories';
import { attributeFieldErrors, auctionErrorMessage } from '../auctions.errors';
import {
  DURATION_PRESETS,
  defaultFormValues,
  makeAuctionFormSchema,
  relistFormValues,
  toWritePayload,
  withoutNullPrices,
  type AuctionFormValues,
} from '../auctions.schema';
import { CONDITIONS, type AuctionCondition, type AuctionDetail, type AuctionWritePayload } from '../auctions.types';
import { useCreateAuction, useUpdateAuction } from '../use-auctions';
import { useImageUploader } from '../use-image-uploader';
import { VideoUploadField } from './video-upload-field';

// Shared create / edit form. `auction` present = edit mode (prefilled, PATCH
// with only the changed fields).
export function AuctionForm({ auction, relistFrom }: { auction?: AuctionDetail; relistFrom?: AuctionDetail }) {
  const router = useRouter();
  const member = useAuthStore((s) => s.member);
  const categories = useCategoryTree();
  const tree = React.useMemo(() => categories.data ?? [], [categories.data]);
  const maxPricePaise = useMaxPricePaise();
  const create = useCreateAuction();
  const update = useUpdateAuction(auction?.id ?? '');
  const defaults = React.useMemo(() => (relistFrom ? relistFormValues(relistFrom) : defaultFormValues(auction)), [auction, relistFrom]);
  // The attribute rules depend on the chosen category, so the schema is built per validation run.
  const resolver = React.useMemo<Resolver<AuctionFormValues>>(
    () => (values, context, options) =>
      zodResolver(makeAuctionFormSchema(auction?.startTime, maxPricePaise, attributeSchemaFor(tree, values.categoryId)))(values, context, options),
    [auction?.startTime, maxPricePaise, tree],
  );

  const form = useForm<AuctionFormValues>({ resolver, defaultValues: defaults });
  const { control, register, handleSubmit, setValue, setError, getValues, formState } = form;
  const errors = formState.errors;
  const startNow = useWatch({ control, name: 'startNow' });
  const duration = useWatch({ control, name: 'duration' });
  const [videoBusy, setVideoBusy] = React.useState(false);
  const categoryId = useWatch({ control, name: 'categoryId' });
  const attributes = useWatch({ control, name: 'attributes' });
  const pickup = useWatch({ control, name: 'pickup' });
  const courier = useWatch({ control, name: 'courier' });
  const attributeDefs = React.useMemo(() => attributeSchemaFor(tree, categoryId), [tree, categoryId]);
  const attrErrors = Object.fromEntries(
    Object.entries(errors.attributes ?? {}).map(([k, v]) => [k, (v as { message?: string } | undefined)?.message]),
  );

  const onCategory = (id: string) => {
    const keep = new Set(attributeSchemaFor(tree, id).map((d) => d.key));
    const next = Object.fromEntries(Object.entries(getValues('attributes')).filter(([k]) => keep.has(k)));
    setValue('categoryId', id, { shouldDirty: true, shouldValidate: formState.isSubmitted });
    setValue('attributes', next, { shouldDirty: true });
  };

  const uploader = useImageUploader({
    initialUrls: defaults.images,
    onChange: (urls) => setValue('images', urls, { shouldDirty: true, shouldValidate: formState.isSubmitted }),
  });

  const unpaid = member?.unpaidCommissionPaise ?? 0;
  const blocked = !auction && unpaid > 0;
  const pending = create.isPending || update.isPending;

  const onSubmit = (values: AuctionFormValues) => {
    const payload = toWritePayload(values, attributeDefs);
    const onError = (e: unknown) => {
      const fieldErrors = attributeFieldErrors(e);
      for (const [key, message] of Object.entries(fieldErrors)) setError(`attributes.${key}`, { message });
      if (apiErrorCode(e) === 'COMMISSION_UNPAID') {
        toast.error(auctionErrorMessage(e), { action: { label: 'Pay now', onClick: () => router.push('/sell/commissions') } });
        return;
      }
      if (apiErrorCode(e) === 'PAYOUT_ACCOUNT_REQUIRED') {
        toast.error(auctionErrorMessage(e), { action: { label: 'Set up', onClick: () => router.push('/sell/payouts') } });
        return;
      }
      toast.error(auctionErrorMessage(e, 'Could not save the auction'));
    };
    if (!auction) {
      create.mutate(withoutNullPrices(payload), {
        onSuccess: (a) => {
          toast.success('Auction created');
          router.push(`/auctions/${a.id}`);
        },
        onError,
      });
      return;
    }
    // Edit: send only what changed (an unchanged start time may already be in the past).
    const original = toWritePayload(defaultFormValues(auction), attributeSchemaFor(tree, auction.categoryId ?? '').length ? attributeSchemaFor(tree, auction.categoryId ?? '') : attributeDefs);
    const diff: Partial<AuctionWritePayload> = {};
    const keys = Object.keys(payload) as (keyof AuctionWritePayload)[];
    for (const k of keys) {
      if (k === 'startTime' && !values.startNow && Math.abs(Date.parse(payload.startTime) - Date.parse(auction.startTime)) < 60_000) continue;
      if (k === 'endTime' && Math.abs(Date.parse(payload.endTime) - Date.parse(auction.endTime)) < 60_000) continue;
      if (JSON.stringify(payload[k]) !== JSON.stringify(original[k]) || (k === 'startTime' && values.startNow)) {
        (diff as Record<string, unknown>)[k] = payload[k];
      }
    }
    if (Object.keys(diff).length === 0) {
      toast.info('Nothing to save — no changes made.');
      return;
    }
    update.mutate(diff, {
      onSuccess: (a) => {
        toast.success('Auction updated');
        router.push(`/auctions/${a.id}`);
      },
      onError,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-3xl space-y-8" noValidate>
      {blocked && (
        <Notice action={{ label: 'Go to commissions', href: '/sell/commissions' }}>
          You have {formatINR(unpaid)} in unpaid commission. Pay it to create new auctions.
        </Notice>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Item details</h2>
        <p className="text-sm text-muted-foreground">
          Check the{' '}
          <Link href={legalPagePath('prohibited-items')} target="_blank" className="font-medium text-primary hover:underline">
            prohibited items list
          </Link>{' '}
          before listing.
        </p>
        <FormInput label="Title" required maxLength={120} error={errors.title?.message} {...register('title')} />

        <div className="space-y-1.5">
          <Label>
            Description <span className="text-destructive">*</span>
          </Label>
          <Controller
            control={control}
            name="description"
            render={({ field }) => <RichTextEditor value={field.value} onChange={field.onChange} placeholder="Describe the item, its condition and any flaws" />}
          />
          {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
        </div>

        <CategoryPicker
          tree={tree}
          value={categoryId}
          onChange={onCategory}
          loading={categories.isPending}
          error={errors.categoryId?.message}
        />

        <AttributeFields
          defs={attributeDefs}
          values={attributes}
          errors={attrErrors}
          onChange={(key, value) => setValue(`attributes.${key}`, value, { shouldDirty: true, shouldValidate: formState.isSubmitted })}
        />

        <div className="max-w-sm space-y-1.5">
          <Label>
            Condition <span className="text-destructive">*</span>
          </Label>
          <Controller
            control={control}
            name="condition"
            render={({ field }) => (
              <Select value={field.value} onValueChange={(v) => field.onChange(v as AuctionCondition)}>
                <SelectTrigger aria-label="Condition" aria-invalid={!!errors.condition}>
                  <SelectValue placeholder="Choose a condition" />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.condition && <p className="text-xs text-destructive">{errors.condition.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Condition report</Label>
          <Controller
            control={control}
            name="conditionReport"
            render={({ field }) => <RichTextEditor value={field.value} onChange={field.onChange} placeholder="Optional: wear, repairs, missing parts, what works and what does not" />}
          />
          <p className="text-xs text-muted-foreground">Optional. Buyers see it in a collapsible section on the listing.</p>
          {errors.conditionReport && <p className="text-xs text-destructive">{errors.conditionReport.message}</p>}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Images</h2>
          <p className="text-sm text-muted-foreground">Add 1–8 images (JPG, PNG or WebP, up to 5 MB each). The first image is the cover.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {uploader.items.map((item, i) => (
            <div key={item.id} className="space-y-1.5">
              <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
                <AssetImage src={item.previewUrl ?? item.url} alt={`Image ${i + 1}`} className="h-full w-full object-cover" />
                {i === 0 && <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">Cover</span>}
                <button
                  type="button"
                  aria-label={`Remove image ${i + 1}`}
                  onClick={() => uploader.remove(item.id)}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm hover:bg-background"
                >
                  <X className="h-4 w-4" />
                </button>
                {item.status === 'uploading' && (
                  <div className="absolute inset-x-0 bottom-0 bg-background/80 p-1.5">
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary transition-all" style={{ width: `${item.progress}%` }} />
                    </div>
                    <p className="mt-0.5 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> {item.progress}%
                    </p>
                  </div>
                )}
                {item.status === 'error' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-destructive/80 p-2 text-center text-[11px] text-destructive-foreground">{item.error}</div>
                )}
              </div>
              <div className="flex justify-center gap-1">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Move left" disabled={i === 0} onClick={() => uploader.move(item.id, -1)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Move right" disabled={i === uploader.items.length - 1} onClick={() => uploader.move(item.id, 1)}>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {uploader.items.length < 8 && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-sm text-muted-foreground transition-colors hover:bg-muted">
              <ImagePlus className="h-6 w-6" aria-hidden />
              Add images
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(e) => {
                  if (e.target.files) uploader.addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
          )}
        </div>
        {errors.images && <p className="text-xs text-destructive">{errors.images.message}</p>}
        <Controller
          control={control}
          name="videoUrl"
          render={({ field }) => <VideoUploadField value={field.value} onChange={(url) => field.onChange(url)} onUploadingChange={setVideoBusy} />}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Pricing</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput label="Starting bid (₹)" required type="number" inputMode="decimal" min={1} step="any" error={errors.startingBid?.message} {...register('startingBid')} />
          <FormInput
            label="Minimum increment (₹)"
            type="number"
            inputMode="decimal"
            min={1}
            step="any"
            hint="Optional. Leave empty for the default."
            error={errors.minIncrement?.message}
            {...register('minIncrement')}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            label="Reserve price (₹)"
            type="number"
            inputMode="decimal"
            min={1}
            step="any"
            hint="Hidden from bidders. Below it, the item doesn't sell."
            error={errors.reservePrice?.message}
            {...register('reservePrice')}
          />
          <FormInput
            label="Buy It Now price (₹)"
            type="number"
            inputMode="decimal"
            min={1}
            step="any"
            hint="Bidders can buy instantly until the first bid."
            error={errors.buyNowPrice?.message}
            {...register('buyNowPrice')}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Estimate</h2>
          <p className="text-sm text-muted-foreground">Optional. Gives bidders a sense of the expected value (₹ low – high).</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput label="Estimate low (₹)" type="number" inputMode="decimal" min={1} step="any" error={errors.estimateLow?.message} {...register('estimateLow')} />
          <FormInput label="Estimate high (₹)" type="number" inputMode="decimal" min={1} step="any" error={errors.estimateHigh?.message} {...register('estimateHigh')} />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Delivery</h2>
          <p className="text-sm text-muted-foreground">How the winner gets the item. Offer pickup, courier, or both.</p>
        </div>
        <Controller
          control={control}
          name="pickup"
          render={({ field }) => (
            <div className="flex items-center gap-3">
              <Switch id="offer-pickup" checked={field.value} onCheckedChange={field.onChange} />
              <Label htmlFor="offer-pickup">Pickup</Label>
            </div>
          )}
        />
        {pickup && <FormInput label="Pickup city" required maxLength={80} error={errors.pickupCity?.message} {...register('pickupCity')} />}
        <Controller
          control={control}
          name="courier"
          render={({ field }) => (
            <div className="flex items-center gap-3">
              <Switch id="offer-courier" checked={field.value} onCheckedChange={field.onChange} />
              <Label htmlFor="offer-courier">Courier</Label>
            </div>
          )}
        />
        {courier && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput
              label="Courier fee (₹)"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              hint="Leave empty for free shipping."
              error={errors.shippingFee?.message}
              {...register('shippingFee')}
            />
            <FormInput label="Ships within (days)" type="number" inputMode="numeric" min={1} max={30} step={1} hint="Optional." error={errors.shipsWithinDays?.message} {...register('shipsWithinDays')} />
          </div>
        )}
        {errors.courier && <p className="text-xs text-destructive">{errors.courier.message}</p>}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Schedule</h2>
        <Controller
          control={control}
          name="startNow"
          render={({ field }) => (
            <div className="flex items-center gap-3">
              <Switch id="start-now" checked={field.value} onCheckedChange={field.onChange} />
              <Label htmlFor="start-now">Start now</Label>
            </div>
          )}
        />
        {!startNow && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="startDate"
              render={({ field }) => <DatePicker label="Start date" required value={field.value} onChange={field.onChange} error={errors.startDate?.message} />}
            />
            <FormInput label="Start time" required type="time" {...register('startTime')} />
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Duration</Label>
          <div className="flex flex-wrap gap-2">
            {DURATION_PRESETS.map((d) => (
              <Button
                key={d.value}
                type="button"
                size="sm"
                variant={duration === d.value ? 'default' : 'outline'}
                aria-pressed={duration === d.value}
                onClick={() => setValue('duration', d.value, { shouldDirty: true })}
                className={cn(d.value === 'custom' && 'ml-auto sm:ml-0')}
              >
                {d.label}
              </Button>
            ))}
          </div>
        </div>
        {duration === 'custom' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="endDate"
              render={({ field }) => <DatePicker label="End date" required value={field.value} onChange={field.onChange} error={errors.endDate?.message} />}
            />
            <FormInput label="End time" required type="time" {...register('endTime')} />
          </div>
        )}
        {duration !== 'custom' && errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message}</p>}
        <p className="text-xs text-muted-foreground">An auction runs for 1 hour to 30 days.</p>
      </section>

      <div className="flex flex-wrap justify-end gap-3 border-t pt-4">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" loading={pending} disabled={blocked || uploader.uploading || videoBusy}>
          {uploader.uploading ? 'Uploading images…' : videoBusy ? 'Uploading video…' : auction ? 'Save changes' : 'Create auction'}
        </Button>
      </div>
    </form>
  );
}
