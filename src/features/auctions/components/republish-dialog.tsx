'use client';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { DatePicker } from '@/components/common/date-picker';
import { FormInput } from '@/components/common/form-input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { auctionErrorMessage } from '../auctions.errors';
import { combineDateTime, republishSchema, type RepublishValues } from '../auctions.schema';
import { useRepublishAuction } from '../use-auctions';

export function RepublishDialog({ auctionId, open, onOpenChange }: { auctionId: string | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const republish = useRepublishAuction();
  const form = useForm<RepublishValues>({
    resolver: zodResolver(republishSchema),
    defaultValues: { startDate: '', startTime: '', endDate: '', endTime: '' },
  });
  const errors = form.formState.errors;

  const onSubmit = (v: RepublishValues) => {
    const start = combineDateTime(v.startDate, v.startTime);
    const end = combineDateTime(v.endDate, v.endTime);
    if (!auctionId || !start || !end) return;
    republish.mutate(
      { id: auctionId, startTime: start.toISOString(), endTime: end.toISOString() },
      {
        onSuccess: () => {
          toast.success('Auction republished');
          form.reset();
          onOpenChange(false);
        },
        onError: (e) => toast.error(auctionErrorMessage(e, 'Could not republish the auction')),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
          <DialogHeader>
            <DialogTitle>Republish auction</DialogTitle>
            <DialogDescription>Choose a new start and end. It can run for 1 hour to 30 days.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller control={form.control} name="startDate" render={({ field }) => <DatePicker label="Start date" required value={field.value} onChange={field.onChange} error={errors.startDate?.message} />} />
            <FormInput label="Start time" required type="time" error={errors.startTime?.message} {...form.register('startTime')} />
            <Controller control={form.control} name="endDate" render={({ field }) => <DatePicker label="End date" required value={field.value} onChange={field.onChange} error={errors.endDate?.message} />} />
            <FormInput label="End time" required type="time" error={errors.endTime?.message} {...form.register('endTime')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={republish.isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={republish.isPending}>
              Republish
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
