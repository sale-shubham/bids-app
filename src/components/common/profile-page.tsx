'use client';
import { Bell, BellRing, FileText, Gift, Heart, KeyRound, UserRound } from 'lucide-react';
import { MorePage, type ProfileTab } from '@/components/layout/more-page';
import { useNav } from '@/components/layout/nav-items';
import { ProfileIdentityCard } from '@/components/common/profile-identity-card';
import { BillingDetailsCard } from '@/components/common/billing-details-card';
import { ProfileEditCard } from '@/components/common/profile-edit-card';
import { ChangePasswordCard } from '@/components/common/change-password-card';
import { MyDevicesCard } from '@/components/common/my-devices-card';
import { SignOutCard } from '@/components/common/sign-out-card';
import { FollowingCard } from '@/features/follows/components/following-card';
import { NotificationPreferencesCard } from '@/features/notification-preferences/components/notification-preferences-card';
import { InvoicesCard } from '@/features/invoices/components/invoices-card';
import { CreditLedger } from '@/features/referrals/components/credit-ledger';
import { ReferCard } from '@/features/referrals/components/refer-card';
import { AlertsCard } from '@/features/saved-searches/components/alerts-card';
import { useAuthStore } from '@/store/auth-store';

// Profile for every signed-in role: identity + avatar + edit form, security
// (password, devices, sign out) and the shared App tab from <MorePage>. Mounted
// at /profile (MEMBER) and /admin/profile (SUPER_ADMIN).
export function ProfilePage() {
  const nav = useNav();
  const isMember = useAuthStore((s) => s.member?.role === 'MEMBER');
  const isAdmin = useAuthStore((s) => s.member?.role === 'SUPER_ADMIN');
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
          {!isAdmin && <BillingDetailsCard />}
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
    {
      value: 'notifications',
      label: 'Notifications',
      icon: Bell,
      content: <NotificationPreferencesCard />,
    },
    ...(isAdmin ? [] : [{ value: 'following', label: 'Following', icon: Heart, content: <FollowingCard /> }]),
    ...(isAdmin
      ? []
      : [
          {
            value: 'refer',
            label: 'Refer & earn',
            icon: Gift,
            content: (
              <div className="space-y-6">
                <ReferCard />
                <CreditLedger />
              </div>
            ),
          },
          { value: 'invoices', label: 'Invoices', icon: FileText, content: <InvoicesCard /> },
        ]),
    ...(isMember ? [{ value: 'alerts', label: 'Alerts', icon: BellRing, content: <AlertsCard /> }] : []),
  ];

  return <MorePage nav={nav} title="Profile" description="Your account, security, notifications and app settings." tabs={tabs} />;
}
