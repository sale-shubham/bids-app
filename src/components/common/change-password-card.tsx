'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/common/form-input';
import { changePasswordSchema, type ChangePasswordFormValues } from '@/features/auth/auth.schema';
import { authErrorMessage } from '@/features/auth/auth.errors';
import { useChangePassword } from '@/features/auth/use-auth';
import { apiErrorCode } from '@/lib/api-client';

export function ChangePasswordCard() {
  const change = useChangePassword();
  const form = useForm<ChangePasswordFormValues>({ resolver: zodResolver(changePasswordSchema) });
  const { errors } = form.formState;

  const onSubmit = (values: ChangePasswordFormValues) =>
    change.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      {
        onSuccess: () => {
          toast.success('Password changed');
          form.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
        },
        onError: (e) => {
          const message = authErrorMessage(e, 'Could not change your password');
          if (apiErrorCode(e) === 'INVALID_CREDENTIALS') form.setError('currentPassword', { message });
          toast.error(message);
        },
      },
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Change password</CardTitle>
        <CardDescription>Use 8–72 characters with at least one letter and one number.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormInput
            label="Current password"
            type="password"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...form.register('currentPassword')}
          />
          <FormInput
            label="New password"
            type="password"
            autoComplete="new-password"
            error={errors.newPassword?.message}
            {...form.register('newPassword')}
          />
          <FormInput
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...form.register('confirmPassword')}
          />
          <Button type="submit" loading={change.isPending}>
            Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
