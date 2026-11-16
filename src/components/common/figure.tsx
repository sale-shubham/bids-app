import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'default' | 'success' | 'warning' | 'destructive';
const TONE: Record<Tone, string> = { default: 'text-primary', success: 'text-success', warning: 'text-warning', destructive: 'text-destructive' };

/** One compact figure for a strip (same look as the admin dashboard's); a link when `href` is given. */
export function Figure({
  label,
  value,
  icon: Icon,
  tone = 'default',
  href,
  attention,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: Tone;
  href?: string;
  attention?: boolean;
}) {
  const body = (
    <>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className={cn('h-3.5 w-3.5 shrink-0', TONE[tone])} aria-hidden />
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-0.5 truncate text-lg font-semibold tnum">{value}</p>
    </>
  );
  const cls = cn('min-w-0 rounded-lg border bg-card px-3 py-2', attention && 'border-warning/60');
  return href ? (
    <Link href={href} className={cn(cls, 'transition-colors hover:bg-muted/40')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** The grid that holds `Figure`s: 2 columns narrow, then 3, then `cols` wide (container queries). */
export function FigureStrip({ cols = 5, children }: { cols?: 3 | 4 | 5 | 7; children: React.ReactNode }) {
  const wide = { 3: '@3xl/content:grid-cols-3', 4: '@3xl/content:grid-cols-4', 5: '@3xl/content:grid-cols-5', 7: '@3xl/content:grid-cols-7' }[cols];
  return (
    <div className={cn('grid grid-cols-2 gap-2 @lg/content:grid-cols-3', wide)} aria-label="Figures">
      {children}
    </div>
  );
}
