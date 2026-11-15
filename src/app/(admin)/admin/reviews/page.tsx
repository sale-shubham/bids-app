'use client';
import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { SearchInput } from '@/components/common/search-input';
import { AdminList, PageHeader, StatusTabs } from '@/features/admin/components/admin-list';
import { useUrlState } from '@/features/admin/use-url-state';
import { StarDisplay } from '@/features/reviews/components/star-rating';
import { reviewErrorMessage } from '@/features/reviews/reviews.errors';
import type { AdminReview } from '@/features/reviews/reviews.types';
import { useAdminReviews, useSetReviewHidden } from '@/features/reviews/use-reviews';
import { formatDate } from '@/lib/utils';

const TABS = [
  { value: 'visible', label: 'Visible' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'all', label: 'All' },
];
const DEFAULTS = { visibility: 'visible', q: '' };

function ReviewsView() {
  const { values, page, pageSize, update } = useUrlState(DEFAULTS);
  const visibility = TABS.some((t) => t.value === values.visibility) ? values.visibility : 'visible';
  const list = useAdminReviews({ visibility, q: values.q }, page, pageSize);
  const setHidden = useSetReviewHidden();
  const [target, setTarget] = React.useState<AdminReview | null>(null);

  const confirm = () => {
    if (!target) return;
    const hide = !target.hiddenAt;
    setHidden.mutate(
      { id: target.id, hidden: hide },
      {
        onSuccess: () => {
          toast.success(hide ? 'Review hidden' : 'Review restored');
          setTarget(null);
        },
        onError: (e) => toast.error(reviewErrorMessage(e, 'Could not update the review')),
      },
    );
  };

  const action = (r: AdminReview) => (
    <Button size="sm" variant="outline" className={r.hiddenAt ? undefined : 'text-destructive'} onClick={() => setTarget(r)}>
      {r.hiddenAt ? 'Unhide' : 'Hide'}
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Reviews" description="Seller ratings left by auction winners. Hide the ones that break the rules." />

      <div className="flex flex-col gap-3 @lg/content:flex-row @lg/content:items-center @lg/content:justify-between">
        <StatusTabs value={visibility} tabs={TABS} onChange={(v) => update({ visibility: v })} />
        <SearchInput className="w-full @lg/content:w-72" value={values.q} onChange={(q) => update({ q })} placeholder="Search comment or member" />
      </div>

      <AdminList<AdminReview>
        list={list}
        page={page}
        onPageChange={(p) => update({ page: String(p) })}
        onPageSizeChange={(s) => update({ pageSize: String(s) })}
        getKey={(r) => r.id}
        empty={{ icon: Star, title: 'No reviews found', description: 'Try a different tab or search.' }}
        renderTable={(items) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rating</TableHead>
                <TableHead>Review</TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <StarDisplay rating={r.rating} />
                  </TableCell>
                  <TableCell className="max-w-72">
                    <Link href={`/auctions/${r.auctionId}`} className="line-clamp-1 text-xs text-muted-foreground hover:underline">
                      {r.auctionTitle}
                    </Link>
                    <p className="line-clamp-3 wrap-break-word text-sm">{r.comment ?? <span className="text-muted-foreground">No comment</span>}</p>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{r.reviewer.name}</div>
                    <div className="max-w-48 truncate text-xs text-muted-foreground">{r.reviewer.email}</div>
                  </TableCell>
                  <TableCell>
                    <Link href={`/sellers/${r.seller.id}`} className="hover:underline">
                      {r.seller.name}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(r.createdAt)}</TableCell>
                  <TableCell>{r.hiddenAt ? <Badge variant="secondary">Hidden</Badge> : <Badge variant="success">Visible</Badge>}</TableCell>
                  <TableCell>{action(r)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        renderCard={(r) => (
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <StarDisplay rating={r.rating} />
                {r.hiddenAt ? <Badge variant="secondary">Hidden</Badge> : <Badge variant="success">Visible</Badge>}
              </div>
              <p className="wrap-break-word text-sm">{r.comment ?? <span className="text-muted-foreground">No comment</span>}</p>
              <p className="text-xs text-muted-foreground">
                {r.reviewer.name} ({r.reviewer.email}) rated {r.seller.name} on {formatDate(r.createdAt)}
              </p>
              {action(r)}
            </CardContent>
          </Card>
        )}
      />

      <ConfirmDialog
        open={!!target}
        onOpenChange={(o) => !o && setTarget(null)}
        title={target?.hiddenAt ? 'Unhide this review?' : 'Hide this review?'}
        description={
          target?.hiddenAt
            ? 'It will show again on the seller page and count towards their rating.'
            : 'It will disappear from the seller page and stop counting towards their rating.'
        }
        confirmLabel={target?.hiddenAt ? 'Unhide' : 'Hide review'}
        variant={target?.hiddenAt ? 'default' : 'destructive'}
        loading={setHidden.isPending}
        onConfirm={confirm}
      />
    </div>
  );
}

export default function AdminReviewsPage() {
  return (
    <Suspense>
      <ReviewsView />
    </Suspense>
  );
}
