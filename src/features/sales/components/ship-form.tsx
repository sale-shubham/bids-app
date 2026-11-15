'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { FormInput } from '@/components/common/form-input';
import { saleErrorMessage } from '../sales.errors';
import { shipSchema, toShipPayload, type ShipValues } from '../sales.schema';
import type { SaleDTO } from '../sales.types';
import { saleActions } from '../sales.utils';
import { useShipSale } from '../use-sales';

/** Seller action on /sell/sales/[id]: mark a PAID sale as shipped (courier + tracking) or handed over for pickup. */
export function ShipForm({ sale }: { sale: SaleDTO }) {
  const ship = useShipSale(sale.id);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ShipValues>({ resolver: zodResolver(shipSchema), defaultValues: { method: 'COURIER', courier: '', trackingNo: '' } });
  const method = useWatch({ control, name: 'method' });

  if (!saleActions(sale).canShip) return null;

  const onSubmit = (v: ShipValues) =>
    ship.mutate(toShipPayload(v), {
      onSuccess: () => toast.success(v.method === 'PICKUP' ? 'Marked as ready for pickup' : 'Marked as shipped'),
      onError: (e) => toast.error(saleErrorMessage(e, 'Could not update the sale')),
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mark as shipped</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <fieldset className="space-y-2">
            <legend className="mb-1.5 text-sm font-medium">Delivery method</legend>
            <div className="flex flex-wrap gap-4 text-sm">
              <Label className="inline-flex items-center gap-2 font-normal">
                <input type="radio" value="COURIER" className="accent-primary" {...register('method')} /> Courier
              </Label>
              <Label className="inline-flex items-center gap-2 font-normal">
                <input type="radio" value="PICKUP" className="accent-primary" {...register('method')} /> Pickup
              </Label>
            </div>
            {errors.method && <p className="text-xs text-destructive">{errors.method.message}</p>}
          </fieldset>

          {method === 'COURIER' && (
            <FormInput label="Courier" required maxLength={60} error={errors.courier?.message} {...register('courier')} />
          )}
          <FormInput
            label="Tracking number"
            maxLength={60}
            hint={method === 'COURIER' ? 'Optional, but it helps the buyer follow the parcel.' : 'Optional.'}
            error={errors.trackingNo?.message}
            {...register('trackingNo')}
          />
          <Button type="submit" loading={ship.isPending}>
            Mark as shipped
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
