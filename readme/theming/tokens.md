# Design tokens

CSS-variable-based design tokens. Base values live in `src/app/globals.css` (`:root` for light, `.dark` for dark); Tailwind maps them to semantic utilities in the `@theme inline` block of the same file (there is no `tailwind.config.ts`). Every colour is stored as an **HSL channel triplet** (e.g. `262 83% 58%`) and consumed via `hsl(var(--token))`, so opacity modifiers like `bg-primary/10` work.

The NobleBid brand is **purple `#7C3AED`** (`--primary`, `--brand-from`), **pink `#DB2777`** (`--brand-to`) and **amber `#D97706`** (`--warning`).

## Pipeline

- **Tailwind v4**, CSS-first, compiled via PostCSS (`postcss.config.mjs` → `@tailwindcss/postcss`; v4 does its own prefixing, no autoprefixer). `globals.css` starts with `@import 'tailwindcss'` + `@import 'tw-animate-css'`, declares `@custom-variant dark (&:is(.dark *))` (class-based dark mode), and re-creates the v3 centred `container` as an `@utility` (used by `/pages/[slug]`). Sources are auto-detected; there is no `content` list.
- **`@theme inline`, not `@theme`**: plain `@theme` emits each token as a variable on `:root` and points utilities at it, so `--font-sans: var(--font-inter)` would resolve on `:root`, where next/font's `--font-inter` (set on `<body>`) does not exist, and the whole app would fall back to system-ui. `inline` puts the value straight into the utility.
- **v3 behaviour kept on purpose**: buttons (and `[role='button']`) keep `cursor: pointer` (v4 preflight dropped it), and `space-y-*` is overridden to v3's margin-top-on-followers form. v4 puts the gap as margin-bottom on the preceding child, which an inline `<Label>` ignores and which doesn't collapse in a flex column.
- `globals.css` defines the token variables in `@layer base` and the custom utilities as `@utility` rules.
- Font: `Inter` loaded in the root layout as `--font-inter`, exposed as `--font-sans: var(--font-inter), system-ui, sans-serif` in `@theme inline`.

## The `cn()` merge helper

`src/lib/utils.ts`:

```ts
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

`clsx` resolves conditional/array class inputs; `twMerge` then dedupes conflicting Tailwind utilities so the **last** wins (e.g. a caller passing `border-destructive` overrides a base `border-input`). Every `ui/` primitive and most `common/` components end their `className` with `cn(base, ...conditionals, className)`, so consumer overrides take precedence without specificity hacks.

`utils.ts` also exports the `en-IN` formatters: `formatINR(paise)` (money is stored in paise; `125050` → "₹1,250.50", no decimals for whole rupees), `formatDate`, `formatMessageTime` (clock time) and `formatListTime` (clock time today, "Yesterday", else a date).

## Colour tokens

Defined in `@theme inline` in `globals.css` as `--color-<name>: hsl(var(--token))`:

| Tailwind class | Variable | Purpose |
|---|---|---|
| `bg-background` / `text-foreground` | `--background` / `--foreground` | Page surface + primary text |
| `bg-card` / `text-card-foreground` | `--card` / `--card-foreground` | Card surface |
| `bg-popover` / `text-popover-foreground` | `--popover` / `--popover-foreground` | Dropdown/dialog/select surface |
| `bg-primary` / `text-primary` / `text-primary-foreground` | `--primary` / `--primary-foreground` | NobleBid brand purple + text on it |
| `bg-secondary` / `text-secondary-foreground` | `--secondary` / `--secondary-foreground` | Subtle surface |
| `bg-muted` / `text-muted-foreground` | `--muted` / `--muted-foreground` | Muted surfaces + secondary text |
| `bg-accent` / `text-accent-foreground` | `--accent` / `--accent-foreground` | Hover/highlight (sidebar links, select options); a light purple tint |
| `bg-destructive` / `text-destructive` | `--destructive` / `--destructive-foreground` | Errors, deletes, the last hour of a countdown |
| `bg-success` / `text-success` | `--success` / `--success-foreground` | Live, paid, active |
| `bg-warning` / `text-warning` | `--warning` / `--warning-foreground` | Brand amber: upcoming, due, attention |
| `border-border` | `--border` | All borders (`* { @apply border-border }` global default) |
| `border-input` | `--input` | Form control borders |
| `ring-ring` | `--ring` | Focus ring (= primary) |

`--brand-from` / `--brand-to` have no Tailwind colour; they feed the gradient utilities below.

### Actual values

| Token | Light (`:root`) | Dark (`.dark`) |
|---|---|---|
| `--primary` | `262 83% 58%` (`#7C3AED`) | `262 90% 66%` (lifted for contrast on the dark canvas) |
| `--brand-from` → `--brand-to` | `262 83% 58%` → `333 71% 51%` (`#DB2777`) | `262 90% 66%` → `333 75% 55%` |
| `--warning` / `--warning-foreground` | `32 95% 44%` (`#D97706`) / white | `36 95% 52%` / near-black `222 47% 9%` |
| `--accent` / `--accent-foreground` | `262 90% 96%` / `262 83% 45%` | `262 30% 22%` / `210 20% 98%` |
| `--background` | `270 25% 98%` (soft off-white) | `222 24% 7%` (deep neutral navy) |
| `--card` | `0 0% 100%` | `222 22% 11%` (cards lift by lightness) |
| `--foreground` | `222 47% 11%` | `210 20% 98%` |

`--radius` is `0.75rem`; `@theme inline` derives `--radius-lg` (`var(--radius)`), `--radius-md` (−2px) and `--radius-sm` (−4px) from it. The installed-app status bar colour (`themeColor: '#7C3AED'` in the root layout's `viewport`) is the same purple, set in metadata rather than CSS.

`success` / `warning` / `destructive` are **not** part of vanilla shadcn; they're added so `Badge`, `StatusBadge`, `StatCard` and `Countdown` can express status without per-component colours.

## Brand gradient, elevation and other utilities (globals.css)

Beyond the Tailwind colours, `globals.css` defines:

- `--brand-from` / `--brand-to` → `.bg-brand` (135° purple → pink gradient; `Button variant="brand"`, `StatCard accent`) and `.text-gradient` (clipped-text gradient; the `NobleBid` wordmark in every header and the home and about hero headings). `.bg-grid` (gradient + radial mesh) is defined but not used.
- Elevation tokens `--shadow-xs/sm/md/lg`, `--shadow-brand`, `--highlight` → utilities `.shadow-soft` (`Card`, `Button`, `OtpInput` cells), `.shadow-elevated` (`Card hover`), `.shadow-float` (`DropdownMenu`), `.shadow-brand` (`bg-brand` surfaces). `.surface` is defined but not used. In dark mode the shadows cast darker and `--highlight` becomes a faint inset top line that lifts raised surfaces.
- `.skeleton` — `bg-muted` + animated shimmer `::after` (the `shimmer` keyframe). Backs the `Skeleton` primitive.
- `.app-loader` — the ring spinner (`--muted` track, `--primary` arc) shown by `AuthGuard` and the route-group `loading.tsx` files.
- `.tnum` — tabular figures for money and metrics (admin tables, `StatCard`).
- `.animate-price-flash` (the price cell in `BidPanel` flashes `--primary` on a new bid) and `.animate-row-in` (new rows in `BidHistory`). Both, and the unused `.animate-float`, are disabled under `prefers-reduced-motion`.
- **Global themed scrollbar** (applied on `*`, no opt-in class): 8px, `--primary` at 0.5 opacity → 0.8 on hover, transparent track; `scrollbar-width: thin` for Firefox plus `::-webkit-scrollbar` for Chromium/WebKit. Covers the page, sidebar nav, dialogs, popovers and tables.
- `.hide-scrollbar` — opt-out (`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`), more specific than the global scrollbar so it wins wherever applied. Not used anywhere yet.
- `.rich-text` — typography for sanitized HTML rendered by `<RichText>` (legal pages on `/pages/[slug]` and auction descriptions): heading/paragraph rhythm, lists, links, blockquote, code, images, and tables that scroll inside themselves (`display: block; width: max-content; overflow-x: auto`) instead of widening the page. Also maps Quill's `ql-align-*` / `ql-indent-*` classes. Stands in for a typography plugin (this project has none).
- `.ql-*` overrides — re-skin `react-quill-new`'s `snow` stylesheet (imported by `<RichTextEditor>`) onto the tokens: `--border` borders, `--muted` toolbar, `--popover` dropdowns and tooltip, `--primary` active toolbar icons, `--foreground` stroke/fill. Without these the vendor's hardcoded greys break dark mode. Below 640px the link tooltip is pinned to the editor's left edge so it can't widen the page.
- `html, body { touch-action: pan-x pan-y }` — native pinch-zoom off (see `readme/ui/layout.md`).

## Status → variant colour mapping

`StatusBadge` (`src/components/common/status-badge.tsx`) and `AuctionStatusBadge` (`src/features/auctions/components/auction-card.tsx`) map status strings to `Badge` variants, which resolve to these tokens:

| Badge variant | Classes | Tokens |
|---|---|---|
| `default` | `bg-primary/10 text-primary` | primary |
| `success` | `bg-success/10 text-success` | success |
| `warning` | `bg-warning/10 text-warning` | warning |
| `destructive` | `bg-destructive/10 text-destructive` | destructive |
| `secondary` | `bg-secondary text-secondary-foreground` | secondary |
| `outline` | `text-foreground` + border | foreground/border |

`StatCard` uses a parallel `TONE` map (`bg-{tone}/10` chip, `text-{tone}` icon, `ring-{tone}/40` attention ring) over the same `primary`/`success`/`warning`/`destructive` tokens.

## Spacing and typography conventions

- **Spacing** — standard Tailwind scale; `<main>` padding is `px-4 sm:px-6` with `pt-4 sm:pt-6`, cards `p-4`–`p-6`, form field groups `space-y-1.5`, nav links `py-2`.
- **Typography** — body sets `line-height: 1.6`, `letter-spacing: -0.011em`, OpenType `cv11`/`ss01`; `h1`–`h4` tighten to `-0.02em` with `text-wrap: balance`. Sizes use Tailwind utilities (`text-sm` controls/body, `text-xs` hints/labels, `text-2xl` page titles, `text-3xl` metrics). Numeric text adds `.tnum`.
- **Radius** — `rounded-md` (controls/buttons), `rounded-lg` (nav links/tabs), `rounded-xl` (cards/dialogs), `rounded-full` (badges/avatars/switch).

## Anti-patterns

- ❌ `style={{ color: '#7C3AED' }}` — use `text-primary`.
- ❌ `text-red-500` in feature code — use `text-destructive`.
- ❌ Hardcoding `#fff`/`#000` — use `text-foreground` / `bg-background`.
- ❌ Building class strings with template literals — use `cn(...)` so `twMerge` resolves conflicts.

### Places that use raw palette colours today

A few spots reach for a raw Tailwind colour scale instead of a `--token`:

- **Overlays and photo controls** — `bg-black/50` behind `DialogContent`, `bg-black/80` behind `ImageLightbox`, and `HoverGallery`'s black/white arrows and dots, which sit on top of photos rather than on a themed surface.
- **Text on the brand gradient** — `text-white` (and `bg-white/15` chips) on `bg-brand` in `Button variant="brand"` and `StatCard accent`.
- **`OtpStep`'s "Verified" state** — `emerald-*` classes with `dark:` variants, not `--success`.
- **Leaderboard podium** (`features/leaderboard/components/leaderboard-view.tsx`) — gold, silver and bronze (`amber-500`, `slate-400`, `orange-700`) for places 1–3.
- **`WatchButton`'s filled heart** — `text-pink-600`, the same colour as the brand pink but not through `--brand-to`.
- **`common/charts.tsx`** — a raw `hsl(...)` `PALETTE` (the file is not imported anywhere). The admin charts in use pass `hsl(var(--token))` strings to recharts.

Don't generalize from these into hardcoding elsewhere; a new status or brand colour belongs in `globals.css` as a token.

## Reference

- `src/app/globals.css` — token definitions + brand/elevation utilities
- `postcss.config.mjs` — `@tailwindcss/postcss` (Tailwind v4)
- `src/lib/utils.ts` — `cn()` and `en-IN` formatters
- `readme/theming/dark-mode.md` — light/dark mechanics

*Last updated: 2026-11-15 (NobleBid purple/pink/amber values, utilities in use, current raw-colour spots)*
