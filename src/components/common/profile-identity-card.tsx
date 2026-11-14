'use client';
import * as React from 'react';
import { Camera, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MemberAvatar } from '@/components/common/member-avatar';
import { useAuthStore, type Role } from '@/store/auth-store';
import { useUpdateMe } from '@/features/members/use-members';
import { IMAGE_TYPES, useUploadImage } from '@/features/uploads/use-upload';
import { apiErrorMessage } from '@/lib/api-client';
import { formatDate, formatINR } from '@/lib/utils';

const ROLE_LABEL: Record<Role, string> = {
  BIDDER: 'Bidder',
  AUCTIONEER: 'Auctioneer',
  SUPER_ADMIN: 'Super admin',
};

// Who is signed in: avatar (upload -> presign -> PUT -> PATCH /members/me),
// name, email, role badge and account figures.
export function ProfileIdentityCard() {
  const member = useAuthStore((s) => s.member);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const upload = useUploadImage('avatars');
  const update = useUpdateMe();
  if (!member) return null;

  const busy = upload.isPending || update.isPending;

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    try {
      const url = await upload.mutateAsync(file);
      await update.mutateAsync({ avatarUrl: url });
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not update your photo'));
    }
  };

  const details = [
    ...(member.role === 'AUCTIONEER'
      ? [
          {
            label: 'Unpaid commission',
            value: formatINR(member.unpaidCommissionPaise),
            warn: member.unpaidCommissionPaise > 0,
            href: '/sell/commissions',
          },
        ]
      : [
          { label: 'Auctions won', value: String(member.auctionsWon) },
          { label: 'Total spent', value: formatINR(member.moneySpentPaise) },
        ]),
    { label: 'Member since', value: formatDate(member.createdAt) },
  ];

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <div className="relative">
            <MemberAvatar
              id={member.id}
              name={member.name}
              email={member.email}
              avatarUrl={member.avatarUrl}
              size="xl"
            />
            {busy && (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="sr-only">Uploading photo</span>
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h2 className="wrap-break-word text-xl font-semibold">{member.name}</h2>
              <Badge>{ROLE_LABEL[member.role]}</Badge>
            </div>
            <p className="wrap-break-word text-sm text-muted-foreground">{member.email}</p>
            <input
              ref={fileRef}
              type="file"
              accept={IMAGE_TYPES.join(',')}
              className="sr-only"
              aria-label="Upload profile photo"
              tabIndex={-1}
              onChange={onFile}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              <Camera className="h-4 w-4" /> {member.avatarUrl ? 'Change photo' : 'Upload photo'}
            </Button>
          </div>
        </div>

        <dl className="grid gap-4 border-t pt-5 @lg/content:grid-cols-3">
          {details.map((d) => (
            <div key={d.label} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{d.label}</dt>
              <dd className="mt-1 flex items-center gap-2 text-sm font-medium">
                {'href' in d && d.href ? (
                  <Link href={d.href} className="text-primary hover:underline">{d.value}</Link>
                ) : (
                  d.value
                )}
                {'warn' in d && d.warn && <Badge variant="warning">Due</Badge>}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
