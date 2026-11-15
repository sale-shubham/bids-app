'use client';
import * as React from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function recoveryCodesText(codes: string[]) {
  return `NobleBid recovery codes\nEach code works once. Keep them somewhere safe.\n\n${codes.join('\n')}\n`;
}

// Shown once after enabling 2FA or regenerating codes. Nothing leaves this screen
// until the user confirms they saved the codes.
export function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      setCopied(true);
      toast.success('Recovery codes copied');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy');
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([recoveryCodesText(codes)], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'noblebid-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
        Save these recovery codes now. Each works once if you lose your authenticator, and they will not be shown again.
      </div>
      <ul data-testid="recovery-codes" className="grid grid-cols-1 gap-2 rounded-lg border bg-muted/40 p-4 font-mono text-sm sm:grid-cols-2">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => void copy()}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={download}>
          <Download className="h-4 w-4" /> Download .txt
        </Button>
      </div>
      <Button type="button" onClick={onDone}>
        I saved these
      </Button>
    </div>
  );
}
