'use client';
import * as React from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { apiErrorMessage } from '@/lib/api-client';
import { formatINR } from '@/lib/utils';
import { useSetAuctionDeposit } from '../use-deposit-admin';

export const depositRupeesSchemaMessage = 'Enter an amount in rupees (up to 2 decimals), or choose No deposit.';

/** Parses the rupee input to paise; null when invalid or not above zero. */
export function parseDepositRupees(v: string): number | null {
  const t = v.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const paise = Math.round(Number(t) * 100);
  return paise > 0 ? paise : null;
}

type DepositAuction = { id: string; title: string; depositPaise?: number | null };

/** Admin: set (rupee amount) or clear ("No deposit") an auction's bid deposit. */
export function SetDepositDialog({ auction, onClose }: { auction: DepositAuction | null; onClose: () => void }) {
  return auction ? <DepositForm key={auction.id} auction={auction} onClose={onClose} /> : null;
}

function DepositForm({ auction, onClose }: { auction: DepositAuction; onClose: () => void }) {
  const set = useSetAuctionDeposit();
  const [value, setValue] = React.useState(auction.depositPaise ? String(auction.depositPaise / 100) : '');
  const [none, setNone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const confirm = () => {
    const paise = none ? null : parseDepositRupees(value);
    if (!none && paise === null) return setError(depositRupeesSchemaMessage);
    set.mutate(
      { id: auction.id, depositPaise: paise },
      {
        onSuccess: () => {
          toast.success(paise === null ? 'Deposit removed' : `Deposit set to ${formatINR(paise)}`);
          onClose();
        },
        onError: (e) => toast.error(apiErrorMessage(e, 'Could not set the deposit')),
      },
    );
  };

  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && !set.isPending && onClose()}
      title="Set deposit"
      description={`Refundable bid deposit for "${auction.title}". It applies to bidders who have not paid yet.`}
      confirmLabel="Save deposit"
      loading={set.isPending}
      onConfirm={confirm}
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="deposit-rupees">Deposit (₹)</Label>
          <Input
            id="deposit-rupees"
            inputMode="decimal"
            value={value}
            disabled={none}
            aria-invalid={!!error}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="accent-primary"
            checked={none}
            onChange={(e) => {
              setNone(e.target.checked);
              setError(null);
            }}
          />
          No deposit
        </label>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    </ConfirmDialog>
  );
}
