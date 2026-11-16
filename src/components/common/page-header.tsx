import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * The top of every admin screen: an optional back button, the title, an optional
 * line saying what the screen is for, and the screen's actions.
 *
 * One wrapping row at every width. The actions stay beside the title while they
 * fit and drop to the next line when they do not; the title block is `min-w-0`
 * with `wrap-break-word` so a long name wraps instead of widening the page. The
 * title's basis is the floor before the actions wrap. The switch is a container
 * query (`@lg/content`), not `sm:` (docs/CONTAINER_QUERIES.md).
 *
 * Rules (readme/methods/admin-pages.md): a list page passes no `description`,
 * at most one solid primary button in `action` (placed last), secondary actions
 * are `variant="outline"`. Chrome (sidebar, top bar) belongs to the layout, so
 * this is the only header a page renders. Not sticky: only `<main>` scrolls.
 */
export function PageHeader({
  title,
  description,
  backHref,
  backLabel,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Renders the back button when given (detail pages). */
  backHref?: string;
  backLabel?: string;
  /** Buttons or badges belonging to the screen as a whole. */
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-x-3 gap-y-2', className)}>
      <div className="flex min-w-0 grow basis-40 items-center gap-3 @lg/content:basis-80">
        {backHref && (
          <Button variant="outline" size="icon" asChild className="shrink-0">
            <Link href={backHref} aria-label={backLabel ?? 'Back'}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight wrap-break-word @lg/content:text-2xl">{title}</h1>
          {description && <div className="text-sm text-muted-foreground @lg/content:text-base">{description}</div>}
        </div>
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}
