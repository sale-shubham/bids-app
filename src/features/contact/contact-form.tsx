'use client';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { FormInput } from '@/components/common/form-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/store/auth-store';
import { contactErrorMessage, sendContact } from './contact.api';
import { contactSchema, type ContactFormValues } from './contact.schema';

export function ContactForm() {
  const member = useAuthStore((s) => s.member);
  const [sent, setSent] = React.useState(false);
  const send = useMutation({ mutationFn: sendContact, onSuccess: () => setSent(true) });
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', subject: '', message: '' },
  });

  // Prefill from the signed-in member once, without overwriting what they typed.
  React.useEffect(() => {
    if (!member) return;
    if (!getValues('name')) setValue('name', member.name);
    if (!getValues('email')) setValue('email', member.email);
  }, [member, getValues, setValue]);

  if (sent) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-xl border bg-muted/30 p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-success" aria-hidden />
        <h2 className="text-lg font-semibold">Message sent</h2>
        <p className="max-w-sm text-sm text-muted-foreground">Thanks for reaching out. We will reply to the email you provided as soon as we can.</p>
        <Button
          variant="outline"
          onClick={() => {
            reset({ name: member?.name ?? '', email: member?.email ?? '', subject: '', message: '' });
            send.reset();
            setSent(false);
          }}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((v) => send.mutate(v))} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput label="Name" required autoComplete="name" error={errors.name?.message} {...register('name')} />
        <FormInput label="Email" type="email" required autoComplete="email" error={errors.email?.message} {...register('email')} />
      </div>
      <FormInput label="Subject" required error={errors.subject?.message} {...register('subject')} />
      <div className="space-y-1.5">
        <Label htmlFor="message">
          Message <span className="text-destructive">*</span>
        </Label>
        <Textarea id="message" rows={6} aria-invalid={!!errors.message} {...register('message')} />
        {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
      </div>
      {send.isError && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {contactErrorMessage(send.error)}
        </p>
      )}
      <Button type="submit" disabled={send.isPending}>
        {send.isPending ? 'Sending...' : 'Send message'}
      </Button>
    </form>
  );
}
