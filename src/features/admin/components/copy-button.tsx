'use client';
import * as React from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      toast.success(`${label} copied`);
      setTimeout(() => setDone(false), 1500);
    } catch {
      toast.error('Could not copy');
    }
  };
  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={`Copy ${label}`}
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

/** Monospace id with a copy button; "-" when absent. */
export function CopyableId({ value, label }: { value: string | null; label: string }) {
  if (!value) return <span className="text-muted-foreground">-</span>;
  return (
    <span className="inline-flex max-w-full items-center gap-1">
      <code className="truncate text-xs">{value}</code>
      <CopyButton value={value} label={label} />
    </span>
  );
}
