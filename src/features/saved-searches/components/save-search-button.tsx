'use client';
import * as React from 'react';
import { BellPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth-store';
import type { AuctionFilters } from '@/features/auctions/auctions.types';
import { savedSearchErrorMessage } from '../saved-searches.errors';
import { savedSearchSchema, type SavedSearchFormValues } from '../saved-searches.schema';
import { hasSearchCriteria, summarizeSavedSearch, toSavedSearchPayload } from '../saved-searches.utils';
import { useCreateSavedSearch } from '../use-saved-searches';

/** "Save this search" for signed-in members once a search/filter is set; opens a name dialog. */
export function SaveSearchButton({ filters }: { filters: AuctionFilters }) {
  const isMember = useAuthStore((s) => s.member?.role === 'MEMBER');
  const create = useCreateSavedSearch();
  const [open, setOpen] = React.useState(false);
  const form = useForm<SavedSearchFormValues>({ resolver: zodResolver(savedSearchSchema), defaultValues: { name: '' } });

  if (!isMember || !hasSearchCriteria(filters)) return null;

  const payload = toSavedSearchPayload(filters);
  const summary = summarizeSavedSearch({
    id: '',
    name: null,
    q: payload.q ?? null,
    category: payload.category ?? null,
    condition: payload.condition ?? null,
    minPricePaise: payload.minPricePaise ?? null,
    maxPricePaise: payload.maxPricePaise ?? null,
    createdAt: '',
  });

  const onSubmit = (v: SavedSearchFormValues) =>
    create.mutate(toSavedSearchPayload(filters, v.name), {
      onSuccess: () => {
        toast.success('Search saved. We will notify you about new matches.');
        form.reset({ name: '' });
        setOpen(false);
      },
      onError: (e) => toast.error(savedSearchErrorMessage(e, 'Could not save this search')),
    });

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <BellPlus className="h-4 w-4" aria-hidden /> Save this search
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save this search</DialogTitle>
            <DialogDescription>Get notified when a new auction matches: {summary}</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="saved-search-name">Name (optional)</Label>
              <Input id="saved-search-name" maxLength={60} placeholder="e.g. Brass vases under 2,000" aria-invalid={!!form.formState.errors.name} {...form.register('name')} />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={create.isPending}>
                Cancel
              </Button>
              <Button type="submit" loading={create.isPending}>
                Save search
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
