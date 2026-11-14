import { cn } from '@/lib/utils';

// Shared circular initials avatar — this app has no profile photos anywhere,
// so every "who is this" surface (chat sidebar rows, thread header, admin
// oversight list/dialog) renders a colored initials circle instead. See
// readme/flows/messaging.md / readme/ui/components.md.

// Fixed, semantic-token-safe palette — cycled by a stable hash of the
// person's id (falling back to name/email when no id is available) so the
// same person always gets the same color, in both light and dark themes.
// No hardcoded hex anywhere (hard rule 7) — every entry is a Tailwind
// utility pair resolving to this app's own CSS-var tokens.
const PALETTE = [
  'bg-primary/15 text-primary',
  'bg-accent text-accent-foreground',
  'bg-success/15 text-success',
  'bg-warning/15 text-warning',
  'bg-secondary text-secondary-foreground',
  'bg-destructive/15 text-destructive',
];

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
} as const;

function hashToIndex(seed: string, mod: number) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % mod;
}

function initialsFor(name: string | null, email: string) {
  const trimmed = (name || '').trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return trimmed.slice(0, 2).toUpperCase();
  }
  return email.slice(-2);
}

export interface InitialsAvatarProps {
  /** Stable id to hash the palette color from (e.g. the member's id). Falls back to name/email when absent. */
  id?: string;
  name: string | null;
  email: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

export function InitialsAvatar({ id, name, email, size = 'md', className }: InitialsAvatarProps) {
  const seed = id || name || email;
  const colorClass = PALETTE[hashToIndex(seed, PALETTE.length)];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold',
        SIZE_CLASSES[size],
        colorClass,
        className,
      )}
      aria-hidden
    >
      {initialsFor(name, email)}
    </span>
  );
}

export default InitialsAvatar;
