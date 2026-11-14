'use client';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/common/motion';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  /** optional secondary link below the primary action */
  secondaryLabel?: string;
  secondaryHref?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryLabel,
  secondaryHref,
}: EmptyStateProps) {
  return (
    <Reveal className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      {/* brand-tinted icon with soft halo */}
      <div className="relative mb-1">
        <div className="absolute inset-0 -z-10 scale-150 rounded-full bg-primary/20 blur-2xl" aria-hidden />
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
          <Icon className="h-8 w-8" />
        </div>
      </div>
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {actionLabel &&
        (actionHref ? (
          <Button asChild className="mt-2">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        ) : (
          <Button className="mt-2" onClick={onAction}>
            {actionLabel}
          </Button>
        ))}
      {secondaryLabel && secondaryHref && (
        <Button asChild variant="link" size="sm" className="text-muted-foreground">
          <Link href={secondaryHref}>{secondaryLabel}</Link>
        </Button>
      )}
    </Reveal>
  );
}
