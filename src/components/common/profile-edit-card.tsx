'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FormInput } from '@/components/common/form-input';
import { useAuthStore } from '@/store/auth-store';
import { useUpdateMe } from '@/features/members/use-members';
import { profileSchema, type ProfileFormValues } from '@/features/members/members.schema';
import { apiErrorMessage } from '@/lib/api-client';

// Name, phone and address. Email is the login identity and is not editable here.
export function ProfileEditCard() {
  const member = useAuthStore((s) => s.member);
  const update = useUpdateMe();
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    // `values` keeps the form in sync when /members/me refetches.
    values: { name: member?.name ?? '', phone: member?.phone ?? '', address: member?.address ?? '' },
  });
  if (!member) return null;
  const { errors, isDirty } = form.formState;

  // An emptied field is sent as null only if it had a value (so it can be
  // cleared); a field that was already empty is left out of the request.
  const clearable = (next: string, prev: string | null) => (next ? next : prev ? null : undefined);

  const onSubmit = (values: ProfileFormValues) =>
    update.mutate(
      {
        name: values.name,
        phone: clearable(values.phone, member.phone),
        address: clearable(values.address, member.address),
      },
      {
        onSuccess: () => toast.success('Profile updated'),
        onError: (e) => toast.error(apiErrorMessage(e, 'Could not update your profile')),
      },
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Personal details</CardTitle>
        <CardDescription>Your email ({member.email}) is how you log in and cannot be changed here.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormInput label="Name" required autoComplete="name" error={errors.name?.message} {...form.register('name')} />
          <FormInput
            label="Phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            error={errors.phone?.message}
            {...form.register('phone')}
          />
          <div className="space-y-1.5">
            <Label htmlFor="profile-address">Address</Label>
            <Textarea
              id="profile-address"
              rows={3}
              autoComplete="street-address"
              aria-invalid={!!errors.address}
              {...form.register('address')}
            />
            {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
          </div>
          <Button type="submit" loading={update.isPending} disabled={!isDirty}>
            Save changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
