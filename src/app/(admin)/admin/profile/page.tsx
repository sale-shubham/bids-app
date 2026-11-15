'use client';
import { ProfilePage } from '@/components/common/profile-page';

// SUPER_ADMIN profile: the same cards as /profile, inside the admin shell. It is
// the admin bottom bar's 4th tab and the sidebar's bottom-group Profile item.
export default function AdminProfilePage() {
  return <ProfilePage />;
}
