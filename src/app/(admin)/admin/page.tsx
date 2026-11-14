import { LayoutDashboard } from 'lucide-react';
import { ComingSoon } from '@/components/common/coming-soon';

export default function AdminPage() {
  return (
    <ComingSoon
      icon={LayoutDashboard}
      title="Admin"
      phase={6}
      description="Platform stats, members, auctions and commissions will be managed here."
    />
  );
}
