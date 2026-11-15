'use client';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ShareButtons } from '@/features/auctions/components/share-buttons';
import { apiErrorMessage } from '@/lib/api-client';
import { formatINR } from '@/lib/utils';
import { useReferral } from '../use-referrals';

const COUNT_LABELS = [
  { key: 'pending', label: 'Pending' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'rewarded', label: 'Rewarded' },
  { key: 'rejected', label: 'Rejected' },
] as const;

/** Profile > Refer & earn: the member's code and link, how rewards work, referral counts and credit balance. */
export function ReferCard() {
  const q = useReferral();

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Code copied');
    } catch {
      toast.error('Could not copy the code');
    }
  };

  if (q.isPending) return <Skeleton className="h-64 w-full" />;
  if (q.isError || !q.data) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <span>{apiErrorMessage(q.error, 'Could not load your referral details')}</span>
          <Button variant="outline" size="sm" onClick={() => void q.refetch()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }
  const r = q.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Refer &amp; earn</CardTitle>
        <CardDescription>
          Earn {formatINR(r.rewardPaise)} in credits when a friend you invite completes their first purchase or sale. Credits pay for
          promotions and commission.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!r.enabled && (
          <p className="rounded-md bg-warning/10 p-3 text-sm text-warning">
            Referral rewards are paused right now. Your code still works once they resume.
          </p>
        )}

        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Your referral code</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <code className="rounded-md border bg-muted px-3 py-1.5 text-lg font-semibold tracking-wider">{r.code}</code>
              <Button type="button" variant="outline" size="sm" onClick={() => void copyCode(r.code)}>
                <Copy className="h-4 w-4" /> Copy code
              </Button>
            </div>
          </div>
          <ShareButtons title="Join me on NobleBid" path={r.link} />
        </div>

        <dl className="grid grid-cols-2 gap-3 @lg/content:grid-cols-4">
          {COUNT_LABELS.map(({ key, label }) => (
            <div key={key} className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-xl font-bold tnum">{r.counts[key]}</dd>
            </div>
          ))}
        </dl>

        <div className="rounded-lg border bg-primary/5 p-4">
          <p className="text-xs text-muted-foreground">Credit balance</p>
          <p className="text-2xl font-extrabold text-primary">{formatINR(r.creditBalancePaise)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
