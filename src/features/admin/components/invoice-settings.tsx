'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { FormInput } from '@/components/common/form-input';
import {
  formToInvoiceSettings,
  invoiceSettingsSchema,
  invoiceSettingsToForm,
  type InvoiceSettingsValues,
} from '@/features/invoices/invoices.schema';
import type { InvoiceSettings as InvoiceSettingsData } from '@/features/invoices/invoices.types';
import { useInvoiceSettings, useSaveInvoiceSettings } from '@/features/invoices/use-invoices';
import { apiErrorMessage } from '@/lib/api-client';
import { GST_STATES } from '@/lib/gst';

function InvoiceForm({ settings }: { settings: InvoiceSettingsData }) {
  const save = useSaveInvoiceSettings();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<InvoiceSettingsValues>({ resolver: zodResolver(invoiceSettingsSchema), defaultValues: invoiceSettingsToForm(settings) });

  const onSubmit = (v: InvoiceSettingsValues) =>
    save.mutate(formToInvoiceSettings(v), {
      onSuccess: (data) => {
        toast.success('Invoice details saved');
        reset(invoiceSettingsToForm(data));
      },
      onError: (e) => toast.error(apiErrorMessage(e, 'Could not save the invoice details')),
    });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice details</CardTitle>
          <CardDescription>Printed on every invoice NobleBid issues. Without a GSTIN, receipts are issued instead of tax invoices.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 @lg/content:grid-cols-2">
            <FormInput label="Legal name" error={errors.legalName?.message} {...register('legalName')} />
            <FormInput label="GSTIN" maxLength={15} error={errors.gstin?.message} {...register('gstin')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invoice-address">Address</Label>
            <Textarea id="invoice-address" rows={3} aria-invalid={!!errors.address} {...register('address')} />
            {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
          </div>
          <div className="grid gap-4 @lg/content:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="invoice-state">State</Label>
              <Controller
                control={control}
                name="stateCode"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="invoice-state" aria-invalid={!!errors.stateCode}>
                      <SelectValue placeholder="Choose a state" />
                    </SelectTrigger>
                    <SelectContent>
                      {GST_STATES.map((s) => (
                        <SelectItem key={s.code} value={s.code}>
                          {s.name} ({s.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.stateCode && <p className="text-xs text-destructive">{errors.stateCode.message}</p>}
            </div>
            <FormInput label="GST rate (%)" inputMode="decimal" error={errors.gstRatePercent?.message} {...register('gstRatePercent')} />
            <FormInput label="SAC code" inputMode="numeric" error={errors.sacCode?.message} {...register('sacCode')} />
          </div>
          <div className="flex items-center gap-3">
            <Controller
              control={control}
              name="commissionInclusive"
              render={({ field }) => <Switch id="invoice-inclusive" checked={field.value} onCheckedChange={field.onChange} />}
            />
            <Label htmlFor="invoice-inclusive">Commission amounts already include GST</Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={!isDirty || save.isPending} onClick={() => reset(invoiceSettingsToForm(settings))}>
              Reset
            </Button>
            <Button type="submit" loading={save.isPending} disabled={!isDirty}>
              Save invoice details
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

export function InvoiceSettings() {
  const { data, isLoading, error, refetch } = useInvoiceSettings();
  if (error && !data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{apiErrorMessage(error, 'Could not load the invoice details')}</p>
          <Button variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }
  if (isLoading || !data) return <Skeleton className="h-96" />;
  return <InvoiceForm settings={data} />;
}
