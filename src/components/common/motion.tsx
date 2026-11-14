import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

// CSS-only enter animations (tw-animate-css), replacing framer-motion:
// these two wrappers were the app's only use of it, and pulling the library
// into the dashboard shell put ~40 KB of JS on every authed page. Same values
// as before, and `motion-reduce:animate-none` honours the OS reduced-motion
// setting (the framer version did not).

// Fade + rise. Starts when the element mounts (the framer version waited
// until it scrolled into view; the only caller, EmptyState, is shown in view).
export function Reveal({
  children,
  delay = 0,
  y = 16,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'animate-in fade-in slide-in-from-bottom-4 fill-mode-both duration-500 motion-reduce:animate-none',
        className,
      )}
      style={
        {
          '--tw-enter-translate-y': `${y}px`,
          animationDelay: `${delay}s`,
          animationTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}

// Page-enter wrapper for authed routes. Keyed by pathname in DashboardShell,
// so it remounts — and replays — on every navigation.
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out motion-reduce:animate-none">
      {children}
    </div>
  );
}
