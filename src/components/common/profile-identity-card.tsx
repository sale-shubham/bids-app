'use client';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormInput } from '@/components/common/form-input';
import { useAuthStore } from '@/store/auth-store';
import { useUpdateMyName } from '@/features/auth/use-auth';
import { profileNameSchema, type ProfileNameValues } from '@/features/auth/auth.schema';
import { formatDate } from '@/lib/utils';

// Who is signed in: name (editable), email (login identity, read-only). The Account tab of both Profile pages (member /profile, admin
// /admin/profile) — a plain label/value card, like unikorncoatings_app's.
export function ProfileIdentityCard() {
  const member = useAuthStore((s) => s.member);
  const [editOpen, setEditOpen] = React.useState(false);
  if (!member) return null;

  const details = [
    { label: 'Name', value: member.name || 'Not set' },
    { label: 'Role', value: member.role },
    { label: 'Email', value: member.email },
    ...(member.createdAt ? [{ label: 'Member since', value: formatDate(member.createdAt) }] : []),
  ];

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>Your name is yours to change. Email is how you log in.</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} aria-label="Edit name">
          <Pencil className="h-4 w-4" /> Edit
        </Button>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 @lg/content:grid-cols-2">
          {details.map((d) => (
            <div key={d.label} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{d.label}</dt>
              <dd className="mt-1 wrap-break-word text-sm font-medium">{d.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit name</DialogTitle>
            <DialogDescription>Mobile and email are your login identities and can&apos;t be changed here.</DialogDescription>
          </DialogHeader>
          {/* Inside DialogContent so the form remounts (re-seeds) on every open. */}
          <EditNameForm name={member.name ?? ''} onDone={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function EditNameForm({ name, onDone }: { name: string; onDone: () => void }) {
  const update = useUpdateMyName();
  const form = useForm<ProfileNameValues>({ resolver: zodResolver(profileNameSchema), defaultValues: { name } });

  return (
    <form
      onSubmit={form.handleSubmit((values) => update.mutate(values.name, { onSuccess: onDone }))}
      className="space-y-4"
    >
      <FormInput label="Name" required autoFocus error={form.formState.errors.name?.message} {...form.register('name')} />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={update.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={update.isPending}>
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}
