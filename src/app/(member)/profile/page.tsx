'use client';
import { KeyRound, UserRound } from 'lucide-react';
import { MorePage, type ProfileTab } from '@/components/layout/more-page';
import { useNav } from '@/components/layout/nav-items';
import { ProfileIdentityCard } from '@/components/common/profile-identity-card';
import { ProfileEditCard } from '@/components/common/profile-edit-card';
import { ChangePasswordCard } from '@/components/common/change-password-card';
import { MyDevicesCard } from '@/components/common/my-devices-card';
import { SignOutCard } from '@/components/common/sign-out-card';
import { useAuthStore } from '@/store/auth-store';

// Profile for every role: identity + avatar + edit form, security (password,
// devices, sign out) and the shared App tab from <MorePage>.
export default function ProfilePage() {
  const nav = useNav();
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
  ];

  return <MorePage nav={nav} title="Profile" description="Manage your account, security and devices." tabs={tabs} />;
}
