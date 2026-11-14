import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

// Placeholder body for routes whose real page lands in a later phase, so nav
// links resolve instead of 404ing.
export function ComingSoon({
  icon: Icon,
  title,
  phase,
  description,
}: {
  icon: LucideIcon;
  title: string;
  phase: number;
  description?: string;
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <Card>
        <CardContent className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </span>
          <p className="text-lg font-semibold">Coming in Phase {phase}</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {description ?? `${title} is not available yet. Check back soon.`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
