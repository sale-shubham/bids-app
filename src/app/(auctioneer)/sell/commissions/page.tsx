import { Receipt } from 'lucide-react';
import { ComingSoon } from '@/components/common/coming-soon';

export default function SellCommissionsPage() {
  return (
    <ComingSoon
      icon={Receipt}
      title="Commissions"
      phase={5}
      description="Commissions due and paid, and online payment, will appear here."
    />
  );
}
