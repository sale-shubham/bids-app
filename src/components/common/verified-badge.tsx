'use client';
import { ShieldCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface VerifiedBadgeProps {
  verified?: boolean;
  /** `icon` (default): just the check-shield with a tooltip. `label`: icon + "Verified" text. */
  variant?: 'icon' | 'label';
  className?: string;
}

// Verified-seller mark (phone verified + good standing). Renders nothing unless `verified`.
export function VerifiedBadge({ verified, variant = 'icon', className }: VerifiedBadgeProps) {
  if (!verified) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('inline-flex shrink-0 items-center gap-1 text-success', className)} aria-label="Verified seller">
          <ShieldCheck className={variant === 'label' ? 'h-4 w-4' : 'h-3.5 w-3.5'} aria-hidden />
          {variant === 'label' && <span className="text-xs font-medium">Verified</span>}
        </span>
      </TooltipTrigger>
      <TooltipContent>Verified seller: phone number confirmed</TooltipContent>
    </Tooltip>
  );
}
