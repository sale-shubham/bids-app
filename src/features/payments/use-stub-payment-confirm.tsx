'use client';
import * as React from 'react';
import { ConfirmDialog } from '@/components/common/confirm-dialog';

/**
 * Test-mode (`keyId === 'stub'`) confirmation for `useRazorpayPayment`. Pass `confirmStub` to the
 * payment hook and render `stubDialog` once in the page.
 */
export function useStubPaymentConfirm() {
  const [open, setOpen] = React.useState(false);
  const resolver = React.useRef<((ok: boolean) => void) | null>(null);
  const confirmStub = React.useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setOpen(true);
      }),
    [],
  );
  const answer = (ok: boolean) => {
    setOpen(false);
    resolver.current?.(ok);
    resolver.current = null;
  };
  const stubDialog = (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) answer(false);
      }}
      title="Test mode"
      description="Test mode — simulate a successful payment?"
      confirmLabel="Simulate payment"
      onConfirm={() => answer(true)}
    />
  );
  return { confirmStub, stubDialog };
}
