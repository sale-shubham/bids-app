'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, ArrowLeft, ArrowRight, ImagePlus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { AssetImage } from '@/components/common/asset-image';
import { DatePicker } from '@/components/common/date-picker';
import { FormInput } from '@/components/common/form-input';
import { RichTextEditor } from '@/components/common/rich-text-editor';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { apiErrorCode } from '@/lib/api-client';
import { cn, formatINR } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { auctionErrorMessage } from '../auctions.errors';
import {
  DURATION_PRESETS,
  defaultFormValues,
  makeAuctionFormSchema,
  toWritePayload,
  type AuctionFormValues,
} from '../auctions.schema';
import type { AuctionDetail, AuctionWritePayload } from '../auctions.types';
import { useCategories, useCreateAuction, useUpdateAuction } from '../use-auctions';
import { useImageUploader } from '../use-image-uploader';

// Shared create / edit form. `auction` present = edit mode (prefilled, PATCH
// with only the changed fields).
export function AuctionForm({ auction }: { auction?: AuctionDetail }) {
  const router = useRouter();
  const member = useAuthStore((s) => s.member);
  const categories = useCategories();
  const create = useCreateAuction();
  const update = useUpdateAuction(auction?.id ?? '');
  const defaults = React.useMemo(() => defaultFormValues(auction), [auction]);
  const schema = React.useMemo(() => makeAuctionFormSchema(auction?.startTime), [auction?.startTime]);

  const form = useForm<AuctionFormValues>({ resolver: zodResolver(schema), defaultValues: defaults });
  const { control, register, handleSubmit, setValue, formState } = form;
  const errors = formState.errors;
  const startNow = useWatch({ control, name: 'startNow' });
  const duration = useWatch({ control, name: 'duration' });
  const condition = useWatch({ control, name: 'condition' });

  const uploader = useImageUploader({
    initialUrls: defaults.images,
    onChange: (urls) => setValue('images', urls, { shouldDirty: true, shouldValidate: formState.isSubmitted }),
  });

  const unpaid = member?.unpaidCommissionPaise ?? 0;
  const blocked = !auction && unpaid > 0;
  const pending = create.isPending || update.isPending;

  const categoryOptions = React.useMemo(() => {
    const names = (categories.data ?? []).map((c) => c.name);
    if (auction && !names.includes(auction.category)) names.push(auction.category);
    return names;
  }, [categories.data, auction]);

  const onSubmit = (values: AuctionFormValues) => {
    const payload = toWritePayload(values);
    const onError = (e: unknown) => {
      if (apiErrorCode(e) === 'COMMISSION_UNPAID') {
        toast.error(auctionErrorMessage(e), { action: { label: 'Pay now', onClick: () => router.push('/sell/commissions') } });
        return;
      }
      toast.error(auctionErrorMessage(e, 'Could not save the auction'));
    };
    if (!auction) {
      create.mutate(payload, {
        onSuccess: (a) => {
          toast.success('Auction created');
          router.push(`/auctions/${a.id}`);
        },
        onError,
      });
      return;
    }
    // Edit: send only what changed (an unchanged start time may already be in the past).
    const original = toWritePayload(defaultFormValues(auction));
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
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
          <p>
            You have {formatINR(unpaid)} in unpaid commission. Pay it to create new auctions.{' '}
            <Link href="/sell/commissions" className="font-medium text-primary hover:underline">
              Go to commissions
            </Link>
          </p>
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Item details</h2>
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>
              Category <span className="text-destructive">*</span>
            </Label>
            {categoryOptions.length > 0 ? (
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-invalid={!!errors.category}>
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            ) : (
              <Input placeholder="e.g. Watches" aria-invalid={!!errors.category} {...register('category')} />
            )}
            {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>
              Condition <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {(['NEW', 'USED'] as const).map((c) => (
                <Button
                  key={c}
                  type="button"
                  variant={condition === c ? 'default' : 'outline'}
                  aria-pressed={condition === c}
                  onClick={() => setValue('condition', c, { shouldDirty: true })}
                >
                  {c === 'NEW' ? 'New' : 'Used'}
                </Button>
              ))}
            </div>
          </div>
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
        <Button type="submit" loading={pending} disabled={blocked || uploader.uploading}>
          {uploader.uploading ? 'Uploading images…' : auction ? 'Save changes' : 'Create auction'}
        </Button>
      </div>
    </form>
  );
}
