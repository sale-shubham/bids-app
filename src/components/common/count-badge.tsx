import { cn } from '@/lib/utils';

// WhatsApp-style unread count pill — the chat inbox rows and the Chat nav item
// (sidebar, mobile bottom bar, Profile's quick-link grid). Renders nothing at
// 0. Capped at "99+" so a very stale count never blows out its corner.
// `compact` is the smaller size that sits on an icon's corner.
export function CountBadge({
  count,
  compact = false,
  className,
}: {
  count: number | undefined;
  compact?: boolean;
  className?: string;
}) {
  if (!count || count <= 0) return null;
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground',
        compact ? 'h-4 min-w-4 px-1 text-[10px]' : 'h-5 min-w-5 px-1.5 text-[11px]',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
      <span className="sr-only"> unread</span>
    </span>
  );
}
