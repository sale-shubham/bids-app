'use client';
import * as React from 'react';
import QRCode from 'qrcode';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { FormInput } from '@/components/common/form-input';
import { OtpInput } from '@/components/common/otp-input';
import { CopyButton } from '@/features/admin/components/copy-button';
import { RecoveryCodes } from '@/features/auth/components/recovery-codes';
import { authErrorMessage } from '@/features/auth/auth.errors';
import { disableTwoFactorSchema, twoFactorCodeSchema, type DisableTwoFactorFormValues } from '@/features/auth/auth.schema';
import type { TwoFactorSetup } from '@/features/auth/auth.api';
import {
  useRegenerateRecoveryCodes,
  useTwoFactorDisable,
  useTwoFactorEnable,
  useTwoFactorSetup,
} from '@/features/auth/use-auth';
import { apiErrorCode } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';

// Scan target for the authenticator app, rendered client-side from the otpauth URL.
function Qr({ url }: { url: string }) {
  const [src, setSrc] = React.useState<string>();
  React.useEffect(() => {
    let live = true;
    QRCode.toDataURL(url, { margin: 1, width: 192 })
      .then((d) => live && setSrc(d))
      .catch(() => live && setSrc(undefined));
    return () => {
      live = false;
    };
  }, [url]);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- a data: URL; next/image adds nothing
    <img src={src} alt="QR code for your authenticator app" width={192} height={192} className="rounded-md border bg-white p-1" />
  ) : (
    <div className="h-48 w-48 animate-pulse rounded-md bg-muted" />
  );
}

function SetupFlow({
  setup,
  onCancel,
  onEnabled,
}: {
  setup: TwoFactorSetup;
  onCancel: () => void;
  onEnabled: (codes: string[]) => void;
}) {
  const enable = useTwoFactorEnable();
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string>();

  const submit = () => {
    const parsed = twoFactorCodeSchema.safeParse({ code });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    enable.mutate(parsed.data, {
      onSuccess: onEnabled,
      onError: (e) => {
        const message = authErrorMessage(e, 'Could not turn on two-factor authentication');
        setError(message);
        setCode('');
        toast.error(message);
      },
    });
  };

  return (
    <div className="space-y-5">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Open an authenticator app (Google Authenticator, Authy, 1Password).</li>
        <li>Scan the QR code, or type the secret key in by hand.</li>
        <li>Enter the 6-digit code the app shows.</li>
      </ol>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Qr url={setup.otpauthUrl} />
        <div className="min-w-0 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Secret key</p>
          <div className="flex items-center gap-1 rounded-md border bg-muted/40 px-3 py-2">
            <code data-testid="totp-secret" className="break-all font-mono text-sm">
              {setup.secret}
            </code>
            <CopyButton value={setup.secret} label="secret key" />
          </div>
        </div>
      </div>
      <div className="max-w-sm space-y-3">
        <OtpInput fill value={code} onChange={setCode} error={error} disabled={enable.isPending} />
        <div className="flex gap-2">
          <Button type="button" loading={enable.isPending} disabled={code.length !== 6} onClick={submit}>
            Turn on
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={enable.isPending}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// Regenerate and turn-off both need a fresh code, so they are ConfirmDialogs with a small form inside.
function RegenerateDialog({
  open,
  onOpenChange,
  onCodes,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCodes: (c: string[]) => void;
}) {
  const regen = useRegenerateRecoveryCodes();
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string>();

  const close = (o: boolean) => {
    if (!o) {
      setCode('');
      setError(undefined);
    }
    onOpenChange(o);
  };

  const confirm = () => {
    const parsed = twoFactorCodeSchema.safeParse({ code });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    regen.mutate(parsed.data, {
      onSuccess: (codes) => {
        close(false);
        onCodes(codes);
      },
      onError: (e) => {
        const message = authErrorMessage(e, 'Could not regenerate recovery codes');
        setError(message);
        toast.error(message);
      },
    });
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={close}
      title="Regenerate recovery codes"
      description="Your old recovery codes stop working. Enter a code from your authenticator app to continue."
      confirmLabel="Regenerate"
      loading={regen.isPending}
      onConfirm={confirm}
    >
      <OtpInput fill value={code} onChange={setCode} error={error} disabled={regen.isPending} />
    </ConfirmDialog>
  );
}

function DisableDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const disable = useTwoFactorDisable();
  const form = useForm<DisableTwoFactorFormValues>({
    resolver: zodResolver(disableTwoFactorSchema),
    defaultValues: { password: '', code: '' },
  });
  const { errors } = form.formState;

  React.useEffect(() => {
    if (!open) form.reset({ password: '', code: '' });
  }, [open, form]);

  const submit = (values: DisableTwoFactorFormValues) =>
    disable.mutate(values, {
      onSuccess: () => {
        toast.success('Two-factor authentication turned off');
        onOpenChange(false);
      },
      onError: (e) => {
        const message = authErrorMessage(e, 'Could not turn off two-factor authentication');
        const code = apiErrorCode(e);
        if (code === 'TWO_FACTOR_INVALID_CODE') form.setError('code', { message });
        else if (code === 'INVALID_CREDENTIALS' || code === 'INVALID_CURRENT_PASSWORD') form.setError('password', { message });
        toast.error(message);
      },
    });

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Turn off two-factor authentication?"
      description="Your account will be protected by your password only. Confirm with your password and a current code (or a recovery code)."
      confirmLabel="Turn off"
      variant="destructive"
      loading={disable.isPending}
      onConfirm={() => void form.handleSubmit(submit)()}
    >
      <div className="space-y-3">
        <FormInput label="Password" type="password" autoComplete="current-password" error={errors.password?.message} {...form.register('password')} />
        <FormInput label="Authenticator or recovery code" autoComplete="one-time-code" error={errors.code?.message} {...form.register('code')} />
      </div>
    </ConfirmDialog>
  );
}

// Security > Two-factor authentication: set up (QR + secret + code), recovery codes shown once,
// regenerate, turn off.
export function TwoFactorCard() {
  const enabled = useAuthStore((s) => s.member?.twoFactorEnabled === true);
  const setupMutation = useTwoFactorSetup();
  const [setup, setSetup] = React.useState<TwoFactorSetup | null>(null);
  const [codes, setCodes] = React.useState<string[] | null>(null);
  const [regenOpen, setRegenOpen] = React.useState(false);
  const [disableOpen, setDisableOpen] = React.useState(false);

  const start = () =>
    setupMutation.mutate(undefined, {
      onSuccess: setSetup,
      onError: (e) => toast.error(authErrorMessage(e, 'Could not start setup')),
    });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Two-factor authentication</CardTitle>
          <Badge variant={enabled ? 'success' : 'secondary'}>{enabled ? 'On' : 'Off'}</Badge>
        </div>
        <CardDescription>
          Add a second step at login with a code from an authenticator app, so a stolen password is not enough to get into your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {codes ? (
          <RecoveryCodes
            codes={codes}
            onDone={() => {
              setCodes(null);
              toast.success('Recovery codes saved');
            }}
          />
        ) : setup && !enabled ? (
          <SetupFlow
            setup={setup}
            onCancel={() => setSetup(null)}
            onEnabled={(c) => {
              setSetup(null);
              setCodes(c);
            }}
          />
        ) : enabled ? (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => setRegenOpen(true)}>
              Regenerate recovery codes
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => setDisableOpen(true)}
            >
              Turn off
            </Button>
          </div>
        ) : (
          <Button type="button" onClick={start} loading={setupMutation.isPending}>
            <ShieldCheck className="h-4 w-4" /> Set up
          </Button>
        )}
      </CardContent>
      <RegenerateDialog open={regenOpen} onOpenChange={setRegenOpen} onCodes={setCodes} />
      <DisableDialog open={disableOpen} onOpenChange={setDisableOpen} />
    </Card>
  );
}
