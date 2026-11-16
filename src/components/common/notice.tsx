import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle, CircleAlert, Info, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type NoticeTone = 'warning' | 'info' | 'error';

const TONE: Record<NoticeTone, { box: string; icon: string; Icon: LucideIcon }> = {
  warning: { box: 'border-warning/40 bg-warning/10', icon: 'text-warning', Icon: AlertTriangle },
  info: { box: 'border-primary/30 bg-primary/5', icon: 'text-primary', Icon: Info },
  error: { box: 'border-destructive/40 bg-destructive/10', icon: 'text-destructive', Icon: CircleAlert },
};

/**
 * The one slim notice: icon, text and an optional action link. Used for warnings
 * above a page (unpaid commission, strikes), gates ("set up payouts first") and
 * inline "could not load" messages. A container query (`@lg/content`) puts the
 * action beside the text on wide content and under it on narrow.
 * `warning` and `error` announce as an alert; `info` as a status.
 */
export function Notice({
  tone = 'warning',
  icon,
  action,
  className,
  children,
}: {
  tone?: NoticeTone;
  /** Overrides the tone's default icon. */
  icon?: LucideIcon;
  /** Renders a small outline link button. */
  action?: { label: string; href: string };
  className?: string;
  children: React.ReactNode;
}) {
  const t = TONE[tone];
  const Icon = icon ?? t.Icon;
  return (
    <div
      role={tone === 'info' ? 'status' : 'alert'}
      className={cn('flex flex-col gap-2 rounded-lg border px-3 py-2 text-sm @lg/content:flex-row @lg/content:items-center @lg/content:justify-between', t.box, className)}
    >
      <div className="flex min-w-0 items-start gap-2">
        <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', t.icon)} aria-hidden />
        <div className="min-w-0 wrap-break-word">{children}</div>
      </div>
      {action && (
        <Button asChild size="sm" variant="outline" className="shrink-0 self-start @lg/content:self-auto">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
