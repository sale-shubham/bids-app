'use client';
import * as React from 'react';
import { Suspense } from 'react';
import { BadgeCheck, Coins, ShieldAlert, ShieldCheck, UserCheck, Users, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { FilterSelect, ListToolbar } from '@/components/common/list-toolbar';
import { PageHeader } from '@/components/common/page-header';
import { RowActionsMenu, type RowAction } from '@/components/common/row-actions-menu';
import { SearchInput } from '@/components/common/search-input';
import { StatusBadge } from '@/components/common/status-badge';
import { AdjustCreditsDialog } from '@/features/admin/components/adjust-credits-dialog';
import { AdminList } from '@/features/admin/components/admin-list';
import { useAdminMembers, useUpdateMember } from '@/features/admin/use-admin';
import { useUrlState } from '@/features/admin/use-url-state';
import type { AdminMember, MemberSellerFilter, MemberStatusFilter } from '@/features/admin/admin.types';
import { apiErrorCode, apiErrorMessage } from '@/lib/api-client';
import { formatDate, formatINR } from '@/lib/utils';
import { MemberStrikesDialog } from '@/features/strikes/components/member-strikes-dialog';
import { useAuthStore } from '@/store/auth-store';

const DEFAULTS = { q: '', seller: '', status: '' };
const SELLER_FILTERS = [
  { value: 'true', label: 'Sellers' },
  { value: 'false', label: 'Non-sellers' },
];
const STATUS_FILTERS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

function Verified({ at }: { at: string | null }) {
  return at ? (
    <span className="inline-flex items-center gap-1 text-success">
      <BadgeCheck className="h-4 w-4" /> Yes
    </span>
  ) : (
    <span className="text-muted-foreground">No</span>
  );
}

// Trust signals: verified-seller badge (KYC'd payout account), strikes and payout account status.
function TrustBadges({ m }: { m: AdminMember }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {m.verified && (
        <Badge variant="success" className="gap-1">
          <ShieldCheck className="h-3 w-3" aria-hidden /> Verified
        </Badge>
      )}
      {m.activeStrikes > 0 && <Badge variant="warning">{m.activeStrikes} {m.activeStrikes === 1 ? 'strike' : 'strikes'}</Badge>}
      {m.payoutStatus && <Badge variant="outline">Payout: {m.payoutStatus.replace(/_/g, ' ').toLowerCase()}</Badge>}
    </div>
  );
}

function MembersView() {
  const { values, page, pageSize, update } = useUrlState(DEFAULTS);
  const status = STATUS_FILTERS.some((o) => o.value === values.status) ? values.status : '';
  const seller = SELLER_FILTERS.some((o) => o.value === values.seller) ? values.seller : '';
  const filters = { q: values.q, seller: seller as MemberSellerFilter, status: status as MemberStatusFilter };
  const list = useAdminMembers(filters, page, pageSize);
  const mutate = useUpdateMember();
  const selfId = useAuthStore((s) => s.member?.id);

  const [statusTarget, setStatusTarget] = React.useState<AdminMember | null>(null);
  const [verifyTarget, setVerifyTarget] = React.useState<AdminMember | null>(null);
  const [strikesTarget, setStrikesTarget] = React.useState<AdminMember | null>(null);
  const [creditsTarget, setCreditsTarget] = React.useState<AdminMember | null>(null);

  const fail = (e: unknown) =>
    toast.error(apiErrorCode(e) === 'CANNOT_MODIFY_SELF' ? 'You cannot change your own account.' : apiErrorMessage(e, 'Could not update the member'));

  const confirmStatus = () => {
    if (!statusTarget) return;
    const next = !statusTarget.isActive;
    mutate.mutate(
      { id: statusTarget.id, isActive: next },
      {
        onSuccess: () => {
          toast.success(next ? 'Member activated' : 'Member deactivated');
          setStatusTarget(null);
        },
        onError: fail,
      },
    );
  };

  const confirmVerification = () => {
    if (!verifyTarget) return;
    const next = !verifyTarget.verified;
    mutate.mutate(
      { id: verifyTarget.id, verified: next },
      {
        onSuccess: () => {
          toast.success(next ? 'Verification restored' : 'Verification revoked');
          setVerifyTarget(null);
        },
        onError: fail,
      },
    );
  };

  const actions = (m: AdminMember) => {
    const isSelf = m.id === selfId;
    const selfHint = isSelf ? 'You cannot modify your own account' : undefined;
    const list: RowAction[] = [
      { label: m.isActive ? 'Deactivate' : 'Activate', icon: m.isActive ? UserX : UserCheck, onSelect: () => setStatusTarget(m), disabled: isSelf, hint: selfHint },
      { label: m.activeStrikes > 0 ? `Strikes (${m.activeStrikes})` : 'Strikes', icon: ShieldAlert, onSelect: () => setStrikesTarget(m) },
      { label: 'Adjust credits', icon: Coins, onSelect: () => setCreditsTarget(m) },
    ];
    if (m.verified || m.payoutStatus === 'ACTIVE') {
      list.push({ label: m.verified ? 'Revoke verification' : 'Restore verification', icon: ShieldCheck, onSelect: () => setVerifyTarget(m) });
    }
    return <RowActionsMenu name={m.name || m.email} actions={list} />;
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Members" />

      <ListToolbar
        search={<SearchInput value={values.q} onChange={(q) => update({ q })} placeholder="Search name, email or phone" />}
        activeFilters={[seller, status].filter(Boolean).length}
        onClearFilters={() => update({ seller: '', status: '' })}
      >
        <FilterSelect value={seller} onChange={(v) => update({ seller: v })} options={SELLER_FILTERS} allLabel="All members" ariaLabel="Selling" />
        <FilterSelect value={status} onChange={(v) => update({ status: v })} options={STATUS_FILTERS} allLabel="Any status" ariaLabel="Status" />
      </ListToolbar>

      <AdminList<AdminMember>
        list={list}
        page={page}
        onPageChange={(p) => update({ page: String(p) })}
        onPageSizeChange={(s) => update({ pageSize: String(s) })}
        getKey={(m) => m.id}
        empty={{ icon: Users, title: 'No members found', description: 'Try a different search or filter.' }}
        renderTable={(items) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Trust</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Unpaid comm.</TableHead>
                <TableHead className="text-right">Credits</TableHead>
                <TableHead className="text-right">Listed</TableHead>
                <TableHead className="text-right">Wins</TableHead>
                <TableHead className="text-right">Spent</TableHead>
                <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    {m.name || '-'} {m.id === selfId && <span className="text-xs text-muted-foreground">(you)</span>}
                  </TableCell>
                  <TableCell className="max-w-56 truncate">{m.email}</TableCell>
                  <TableCell>
                    <Verified at={m.emailVerifiedAt} />
                  </TableCell>
                  <TableCell className="min-w-44">
                    <TrustBadges m={m} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={m.isActive ? 'ACTIVE' : 'INACTIVE'} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(m.createdAt)}</TableCell>
                  <TableCell className="text-right tnum">{formatINR(m.unpaidCommissionPaise)}</TableCell>
                  <TableCell className="text-right tnum">{formatINR(m.creditBalancePaise)}</TableCell>
                  <TableCell className="text-right tnum">{m.auctionsListed}</TableCell>
                  <TableCell className="text-right tnum">{m.auctionsWon}</TableCell>
                  <TableCell className="text-right tnum">{formatINR(m.moneySpentPaise)}</TableCell>
                  <TableCell className="text-right">{actions(m)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        renderCard={(m) => (
          <Card>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium wrap-break-word">
                    {m.name || '-'} {m.id === selfId && <span className="text-xs text-muted-foreground">(you)</span>}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{m.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <StatusBadge status={m.isActive ? 'ACTIVE' : 'INACTIVE'} />
                  {actions(m)}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Verified at={m.emailVerifiedAt} />
                <span className="text-muted-foreground">Joined {formatDate(m.createdAt)}</span>
              </div>
              <TrustBadges m={m} />
              <dl className="grid grid-cols-5 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Credits</dt>
                  <dd className="tnum">{formatINR(m.creditBalancePaise)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Unpaid</dt>
                  <dd className="tnum">{formatINR(m.unpaidCommissionPaise)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Listed</dt>
                  <dd className="tnum">{m.auctionsListed}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Wins</dt>
                  <dd className="tnum">{m.auctionsWon}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Spent</dt>
                  <dd className="tnum">{formatINR(m.moneySpentPaise)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        )}
      />

      <AdjustCreditsDialog member={creditsTarget} onClose={() => setCreditsTarget(null)} />
      <MemberStrikesDialog member={strikesTarget} onClose={() => setStrikesTarget(null)} />

      <ConfirmDialog
        open={!!statusTarget}
        onOpenChange={(o) => !o && setStatusTarget(null)}
        title={statusTarget?.isActive ? 'Deactivate this member?' : 'Activate this member?'}
        description={
          statusTarget?.isActive
            ? `${statusTarget.email} will be signed out and unable to log in until reactivated.`
            : `${statusTarget?.email ?? 'This member'} will be able to log in again.`
        }
        confirmLabel={statusTarget?.isActive ? 'Deactivate' : 'Activate'}
        variant={statusTarget?.isActive ? 'destructive' : 'default'}
        loading={mutate.isPending}
        onConfirm={confirmStatus}
      />

      <ConfirmDialog
        open={!!verifyTarget}
        onOpenChange={(o) => !o && setVerifyTarget(null)}
        title={verifyTarget?.verified ? 'Revoke verification?' : 'Restore verification?'}
        description={
          verifyTarget?.verified
            ? `${verifyTarget.email} will lose the Verified seller badge.`
            : `${verifyTarget?.email ?? 'This member'} will get the Verified seller badge back.`
        }
        confirmLabel={verifyTarget?.verified ? 'Revoke' : 'Restore'}
        variant={verifyTarget?.verified ? 'destructive' : 'default'}
        loading={mutate.isPending}
        onConfirm={confirmVerification}
      />
    </div>
  );
}

export default function AdminMembersPage() {
  return (
    <Suspense>
      <MembersView />
    </Suspense>
  );
}
