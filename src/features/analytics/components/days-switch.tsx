'use client';
import { cn } from '@/lib/utils';
import { ANALYTICS_DAYS, type AnalyticsDays } from '../analytics.api';

/** 7 / 30 / 90 day range switch. */
export function DaysSwitch({ value, onChange }: { value: AnalyticsDays; onChange: (d: AnalyticsDays) => void }) {
  return (
    <div role="group" aria-label="Date range" className="inline-flex rounded-lg border p-0.5">
      {ANALYTICS_DAYS.map((d) => (
        <button
          key={d}
          type="button"
          aria-pressed={value === d}
          onClick={() => onChange(d)}
          className={cn(
            'rounded-md px-3 py-1 text-sm font-medium transition-colors',
            value === d ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {d} days
        </button>
      ))}
    </div>
  );
}
