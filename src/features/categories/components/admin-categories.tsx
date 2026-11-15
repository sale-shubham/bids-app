'use client';
import * as React from 'react';
import { AlertTriangle, FolderTree, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/features/admin/components/admin-list';
import { apiErrorMessage } from '@/lib/api-client';
import { categoryErrorMessage } from '../categories.errors';
import type { AdminCategory } from '../categories.types';
import { adminTreeRows } from '../categories.utils';
import { useAdminCategories, useDeleteCategory, useUpdateCategory } from '../use-categories';
import { CategoryDialog } from './category-dialog';

/** Why a category cannot be deleted right now (null = it can). */
export function deleteBlockReason(c: AdminCategory, rows: AdminCategory[]): string | null {
  if (c.auctionCount > 0) return 'Has auctions: deactivate it instead';
  if (rows.some((r) => r.parentId === c.id)) return 'Has subcategories: delete or move them first';
  return null;
}

/** /admin/categories body: the category tree with active toggles, counts, create / edit / delete. */
export function AdminCategories() {
  const { data, isPending, error, refetch } = useAdminCategories();
  const update = useUpdateCategory();
  const del = useDeleteCategory();
  const [dialog, setDialog] = React.useState<{ category?: AdminCategory; parentId?: string } | null>(null);
  const [toDelete, setToDelete] = React.useState<AdminCategory | null>(null);
  const rows = React.useMemo(() => data ?? [], [data]);
  const tree = React.useMemo(() => adminTreeRows(rows), [rows]);

  const toggle = (c: AdminCategory, isActive: boolean) =>
    update.mutate({ id: c.id, isActive }, { onError: (e) => toast.error(categoryErrorMessage(e, 'Could not update the category')) });

  const onDelete = () => {
    if (!toDelete) return;
    del.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success('Category deleted');
        setToDelete(null);
      },
      onError: (e) => {
        toast.error(categoryErrorMessage(e, 'Could not delete the category'));
        setToDelete(null);
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Categories" description="The category tree sellers list in and bidders browse by, with the attributes of each.">
        <Button onClick={() => setDialog({})}>
          <Plus className="h-4 w-4" /> New category
        </Button>
      </PageHeader>

      {error && !data ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{apiErrorMessage(error, 'Could not load categories')}</p>
            <Button variant="outline" onClick={() => void refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : isPending ? (
        <Skeleton className="h-64" />
      ) : tree.length === 0 ? (
        <EmptyState icon={FolderTree} title="No categories yet" description="Create the first category to let sellers list items." actionLabel="New category" onAction={() => setDialog({})} />
      ) : (
        <Card>
          <ul className="divide-y" aria-label="Categories">
            {tree.map(({ node, depth }) => {
              const blocked = deleteBlockReason(node, rows);
              return (
                <li key={node.id} className="flex flex-wrap items-center gap-3 px-4 py-3" data-testid="category-row">
                  <div className="min-w-0 flex-1" style={{ paddingLeft: `${depth * 20}px` }}>
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {node.name}
                      {!node.isActive && <Badge variant="secondary">Inactive</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      /{node.slug} · {node.auctionCount} {node.auctionCount === 1 ? 'auction' : 'auctions'} · {node.attributeSchema.length}{' '}
                      {node.attributeSchema.length === 1 ? 'attribute' : 'attributes'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch checked={node.isActive} onCheckedChange={(v) => toggle(node, v)} aria-label={`${node.isActive ? 'Deactivate' : 'Activate'} ${node.name}`} disabled={update.isPending} />
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={`Add subcategory to ${node.name}`} onClick={() => setDialog({ parentId: node.id })}>
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={`Edit ${node.name}`} onClick={() => setDialog({ category: node })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      aria-label={`Delete ${node.name}`}
                      title={blocked ?? undefined}
                      disabled={!!blocked}
                      onClick={() => setToDelete(node)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {dialog && (
        <CategoryDialog open onOpenChange={(o) => !o && setDialog(null)} category={dialog.category} rows={rows} defaultParentId={dialog.parentId} />
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete ${toDelete?.name ?? 'category'}?`}
        description="This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        loading={del.isPending}
        onConfirm={onDelete}
      />
    </div>
  );
}
