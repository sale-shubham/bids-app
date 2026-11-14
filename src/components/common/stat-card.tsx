import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, ArrowDownRight, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Tone = 'default' | 'primary' | 'success' | 'warning' | 'destructive';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
  accent?: boolean;
  tone?: Tone;
  /** draws a colored ring when the metric needs the user's attention */
  attention?: boolean;
  trend?: { value: string; up?: boolean };
  /** Makes the whole card a link (e.g. to that metric's own admin page). */
  href?: string;
  /** Denser single-row layout (icon+label+value on one line) for a grid of many cards. */
  compact?: boolean;
}

const TONE: Record<Tone, { chip: string; icon: string; ring: string }> = {
  default: { chip: 'bg-primary/10', icon: 'text-primary', ring: 'ring-primary/40' },
  primary: { chip: 'bg-primary/10', icon: 'text-primary', ring: 'ring-primary/40' },
  success: { chip: 'bg-success/10', icon: 'text-success', ring: 'ring-success/40' },
  warning: { chip: 'bg-warning/10', icon: 'text-warning', ring: 'ring-warning/40' },
  destructive: { chip: 'bg-destructive/10', icon: 'text-destructive', ring: 'ring-destructive/40' },
};

export function StatCard({ label, value, icon: Icon, hint, accent, tone = 'default', attention, trend, href }: StatCardProps) {
  const t = TONE[tone];
  const card = (
    <Card
      hover={!accent}
      className={cn(
        'overflow-hidden',
        accent && 'border-0 bg-brand text-white shadow-brand',
        attention && !accent && 'ring-2 ring-offset-2 ring-offset-background',
        attention && !accent && t.ring,
        href && 'cursor-pointer',
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className={cn('text-sm font-medium', accent ? 'text-white/80' : 'text-muted-foreground')}>{label}</span>
          {Icon && (
            <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', accent ? 'bg-white/15' : t.chip)}>
              <Icon className={cn('h-4 w-4', accent ? 'text-white' : t.icon)} />
            </span>
          )}
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div className="text-3xl font-bold tracking-tight tnum">{value}</div>
          {trend && (
            <span className={cn('flex items-center gap-0.5 text-xs font-medium', accent ? 'text-white/90' : trend.up ? 'text-success' : 'text-destructive')}>
              {trend.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {trend.value}
            </span>
          )}
        </div>
        {(hint || href) && (
          <div className="mt-1 flex items-center justify-between">
            {hint && <p className={cn('text-xs', accent ? 'text-white/70' : 'text-muted-foreground')}>{hint}</p>}
            {href && <ChevronRight className={cn('ml-auto h-4 w-4', accent ? 'text-white/70' : 'text-muted-foreground')} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}
