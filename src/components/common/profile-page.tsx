'use client';
import { BellRing, KeyRound, UserRound } from 'lucide-react';
import { MorePage, type ProfileTab } from '@/components/layout/more-page';
import { useNav } from '@/components/layout/nav-items';
import { ProfileIdentityCard } from '@/components/common/profile-identity-card';
import { ProfileEditCard } from '@/components/common/profile-edit-card';
import { ChangePasswordCard } from '@/components/common/change-password-card';
import { MyDevicesCard } from '@/components/common/my-devices-card';
import { SignOutCard } from '@/components/common/sign-out-card';
import { AlertsCard } from '@/features/saved-searches/components/alerts-card';
import { useAuthStore } from '@/store/auth-store';

// Profile for every signed-in role: identity + avatar + edit form, security
// (password, devices, sign out) and the shared App tab from <MorePage>. Mounted
// at /profile (BIDDER / AUCTIONEER) and /admin/profile (SUPER_ADMIN).
export function ProfilePage() {
  const nav = useNav();
  const isBidder = useAuthStore((s) => s.member?.role === 'BIDDER');
  const deviceLimit = useAuthStore((s) => s.member?.deviceLimit ?? 1);

  const tabs: ProfileTab[] = [
    {
      value: 'account',
      label: 'Account',
      icon: UserRound,
      content: (
        <div className="space-y-6">
          <ProfileIdentityCard />
          <ProfileEditCard />
        </div>
      ),
    },
    {
      value: 'security',
      label: 'Security',
      icon: KeyRound,
      content: (
        <div className="space-y-6">
          <ChangePasswordCard />
          <MyDevicesCard limit={deviceLimit} />
          <SignOutCard />
        </div>
      ),
    },
    ...(isBidder ? [{ value: 'alerts', label: 'Alerts', icon: BellRing, content: <AlertsCard /> }] : []),
  ];

  return <MorePage nav={nav} title="Profile" description="Manage your account, security and devices." tabs={tabs} />;
}
