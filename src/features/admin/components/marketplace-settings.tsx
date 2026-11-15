'use client';
import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { FormInput } from '@/components/common/form-input';
import { apiErrorMessage } from '@/lib/api-client';
import { categoryNameSchema, formToSettings, marketplaceSchema, settingsToForm, type MarketplaceValues } from '../admin.schema';
import type { AdminSettings } from '../admin.types';
import { useAdminSettings, useSaveSettings } from '../use-admin';

export const CHECKOUT_MODE_OPTIONS = [
  { value: 'off', label: 'Off', help: 'Winners and sellers arrange payment themselves. No checkout button is shown.' },
  { value: 'optional', label: 'Optional', help: 'Winners can pay through the platform when the seller has an active payout account.' },
  { value: 'required', label: 'Required', help: 'Sellers must have an active payout account before they can create auctions.' },
] as const;

function CategoriesEditor({ value, onChange, error }: { value: string[]; onChange: (v: string[]) => void; error?: string }) {
  const [draft, setDraft] = React.useState('');
  const [draftError, setDraftError] = React.useState('');

  const add = () => {
    const parsed = categoryNameSchema.safeParse(draft);
    if (!parsed.success) return setDraftError(parsed.error.issues[0]?.message ?? 'Invalid name');
    if (value.some((c) => c.toLowerCase() === parsed.data.toLowerCase())) return setDraftError('Already in the list');
    if (value.length >= 30) return setDraftError('At most 30 categories');
    onChange([...value, parsed.data]);
    setDraft('');
    setDraftError('');
  };
  const move = (i: number, d: -1 | 1) => {
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setDraftError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          maxLength={40}
          placeholder="New category"
          aria-label="New category"
          aria-invalid={!!draftError}
        />
        <Button type="button" variant="outline" onClick={add}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
      {draftError && <p className="text-xs text-destructive">{draftError}</p>}
      <ul className="divide-y rounded-md border">
        {value.map((c, i) => (
          <li key={c} className="flex items-center gap-2 px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate">{c}</span>
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${c} up`}>
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${c} down`}>
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onChange(value.filter((x) => x !== c))} aria-label={`Remove ${c}`}>
              <X className="h-4 w-4" />
            </Button>
          </li>
        ))}
        {value.length === 0 && <li className="px-3 py-4 text-center text-sm text-muted-foreground">No categories yet.</li>}
      </ul>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function MarketplaceForm({ settings }: { settings: AdminSettings }) {
  const save = useSaveSettings();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<MarketplaceValues>({ resolver: zodResolver(marketplaceSchema), defaultValues: settingsToForm(settings) });
  const checkoutMode = useWatch({ control, name: 'checkoutMode' });

  const onSubmit = (v: MarketplaceValues) =>
    save.mutate(formToSettings(v), {
      onSuccess: (data) => {
        toast.success('Settings saved');
        reset(settingsToForm(data));
      },
      onError: (e) => toast.error(apiErrorMessage(e, 'Could not save settings')),
    });

  const catError = errors.categories?.message ?? (Array.isArray(errors.categories) ? errors.categories.find(Boolean)?.message : undefined);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Auction rules</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 @lg/content:grid-cols-2 @3xl/content:grid-cols-4">
          <FormInput
            label="Commission rate (%)"
            inputMode="decimal"
            hint="0 to 30, up to 2 decimals. Applies to auctions that sell from now on."
            error={errors.commissionPercent?.message}
            {...register('commissionPercent')}
          />
          <FormInput
            label="Minimum bid increment (₹)"
            inputMode="decimal"
            hint="Default for new auctions. At least ₹1."
            error={errors.minIncrementRupees?.message}
            {...register('minIncrementRupees')}
          />
          <FormInput
            label="Anti-sniping window (minutes)"
            inputMode="numeric"
            hint="A late bid extends the end by this long. 0 disables."
            error={errors.antiSnipingMinutes?.message}
            {...register('antiSnipingMinutes')}
          />
          <FormInput
            label="Maximum price (₹)"
            inputMode="decimal"
            hint="Cap on starting bids, increments and bids. ₹1,000 to ₹1,000 crore."
            error={errors.maxPriceRupees?.message}
            {...register('maxPriceRupees')}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bid deposits</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 @lg/content:grid-cols-2">
          <FormInput
            label="Deposit threshold (₹, 0 = off)"
            inputMode="decimal"
            hint="Auctions starting at or above this price need a refundable deposit to bid. 0 turns deposits off."
            error={errors.depositThresholdRupees?.message}
            {...register('depositThresholdRupees')}
          />
          <FormInput
            label="Deposit rate (%)"
            inputMode="decimal"
            hint="Share of the starting bid held as the deposit. 1 to 50, up to 2 decimals."
            error={errors.depositRatePercent?.message}
            {...register('depositRatePercent')}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Checkout</CardTitle>
        </CardHeader>
        <CardContent className="max-w-md space-y-1.5">
          <Label htmlFor="checkout-mode">Checkout mode</Label>
          <Controller
            control={control}
            name="checkoutMode"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="checkout-mode" aria-invalid={!!errors.checkoutMode}>
                  <SelectValue placeholder="Choose a mode" />
                </SelectTrigger>
                <SelectContent>
                  {CHECKOUT_MODE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-xs text-muted-foreground">
            {CHECKOUT_MODE_OPTIONS.find((o) => o.value === checkoutMode)?.help}
          </p>
          {errors.checkoutMode && <p className="text-xs text-destructive">{errors.checkoutMode.message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label className="sr-only">Categories</Label>
          <Controller
            control={control}
            name="categories"
            render={({ field }) => <CategoriesEditor value={field.value} onChange={field.onChange} error={catError} />}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" disabled={!isDirty || save.isPending} onClick={() => reset(settingsToForm(settings))}>
          Reset
        </Button>
        <Button type="submit" loading={save.isPending} disabled={!isDirty}>
          Save settings
        </Button>
      </div>
    </form>
  );
}

export function MarketplaceSettings() {
  const { data, isLoading, error, refetch } = useAdminSettings();
  if (error && !data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{apiErrorMessage(error, 'Could not load settings')}</p>
          <Button variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }
  if (isLoading || !data) return <Skeleton className="h-96" />;
  return <MarketplaceForm settings={data} />;
}
