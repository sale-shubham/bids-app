'use client';
import * as React from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { FormInput } from '@/components/common/form-input';
import { apiErrorMessage } from '@/lib/api-client';
import { formToSettings, marketplaceSchema, settingsToForm, type MarketplaceValues } from '../admin.schema';
import type { AdminSettings } from '../admin.types';
import { useAdminSettings, useSaveSettings } from '../use-admin';

export const CHECKOUT_MODE_OPTIONS = [
  { value: 'off', label: 'Off', help: 'Winners and sellers arrange payment themselves. No checkout button is shown.' },
  { value: 'optional', label: 'Optional', help: 'Winners can pay through the platform when the seller has an active payout account.' },
  { value: 'required', label: 'Required', help: 'Sellers must have an active payout account before they can create auctions.' },
] as const;

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
          <CardTitle className="text-base">Featured listings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Controller
              control={control}
              name="featuredEnabled"
              render={({ field }) => <Switch id="featured-enabled" checked={field.value} onCheckedChange={field.onChange} />}
            />
            <Label htmlFor="featured-enabled">Sellers can pay to promote auctions</Label>
          </div>
          <div className="grid gap-4 @lg/content:grid-cols-3">
            <FormInput label="1-day price (₹)" inputMode="decimal" error={errors.featuredPrice1?.message} {...register('featuredPrice1')} />
            <FormInput label="3-day price (₹)" inputMode="decimal" error={errors.featuredPrice3?.message} {...register('featuredPrice3')} />
            <FormInput label="7-day price (₹)" inputMode="decimal" error={errors.featuredPrice7?.message} {...register('featuredPrice7')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Categories</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 @lg/content:flex-row @lg/content:items-center @lg/content:justify-between">
          <p className="text-sm text-muted-foreground">Categories are now a tree with their own attributes, managed on their own page.</p>
          <Button asChild variant="outline">
            <Link href="/admin/categories">Manage categories</Link>
          </Button>
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
