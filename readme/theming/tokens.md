# Design tokens

CSS-variable-based design tokens. Base values live in `src/app/globals.css` (`:root` for light, `.dark` for dark); Tailwind maps them to semantic utilities in the `@theme inline` block of the same file (there is no `tailwind.config.ts`). Every color is stored as **HSL channel triplets** (e.g. `221 83% 53%`) and consumed via `hsl(var(--token))`, so opacity modifiers like `bg-primary/10` work.

## Pipeline

- **Tailwind v4**, CSS-first, compiled via PostCSS (`postcss.config.mjs` → `@tailwindcss/postcss`; v4 does its own prefixing, no autoprefixer). `globals.css` starts with `@import 'tailwindcss'` + `@import 'tw-animate-css'`, declares `@custom-variant dark (&:is(.dark *))` (class-based dark mode), and re-creates the v3 centred `container` as an `@utility`. Sources are auto-detected — no `content` list.
- **`@theme inline`, not `@theme`**: plain `@theme` emits each token as a variable on `:root` and points utilities at it, so `--font-sans: var(--font-inter)` would resolve on `:root` — where next/font's `--font-inter` (set on `<body>`) does not exist — and the whole app falls back to system-ui. `inline` puts the value straight into the utility.
- **v3 behaviour kept on purpose** (the upgrade was checked pixel-for-pixel against v3 screenshots of the auth and member screens × desktop/mobile): buttons keep `cursor: pointer` (v4 preflight dropped it), and `space-y-*` is overridden to v3's margin-top-on-followers form — v4 puts the gap as margin-bottom on the preceding child, which an inline `<Label>` ignores and which doesn't collapse in a flex column. The login hero `h2` carries `xl:leading-none` because in v3 the responsive `xl:text-5xl` line-height beat `leading-[1.1]`; v4 keeps the explicit leading.
- `globals.css` defines the token variables in `@layer base` and the custom utilities as `@utility` rules.
- Font: `Inter` loaded in the root layout as `--font-inter`, exposed as `--font-sans: var(--font-inter), system-ui, sans-serif` in `@theme inline`.

## The `cn()` merge helper

`src/lib/utils.ts`:

```ts
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

`clsx` resolves conditional/array class inputs; `twMerge` then dedupes conflicting Tailwind utilities so the **last** wins (e.g. a caller passing `border-destructive` overrides a base `border-input`). Every `ui/` primitive and most `common/` components end their `className` with `cn(base, ...conditionals, className)`, so consumer overrides always take precedence without specificity hacks.

`utils.ts` also exports `en-IN` formatters used by metric components: `formatInr`, `formatDate`. (`formatPoints` was removed along with the wallet/points feature.)

## Color tokens

Defined in `@theme inline` in `globals.css` as `--color-<name>: hsl(var(--token))`:

| Tailwind class | Variable | Purpose |
|---|---|---|
| `bg-background` / `text-foreground` | `--background` / `--foreground` | Page surface + primary text |
| `bg-card` / `text-card-foreground` | `--card` / `--card-foreground` | Card surface |
| `bg-popover` / `text-popover-foreground` | `--popover` / `--popover-foreground` | Dropdown/dialog/select surface |
| `bg-primary` / `text-primary` / `text-primary-foreground` | `--primary` / `--primary-foreground` | NobleBid brand blue + text on it |
| `bg-secondary` / `text-secondary-foreground` | `--secondary` / `--secondary-foreground` | Subtle surface |
| `bg-muted` / `text-muted-foreground` | `--muted` / `--muted-foreground` | Muted surfaces + secondary text |
| `bg-accent` / `text-accent-foreground` | `--accent` / `--accent-foreground` | Hover/highlight (sidebar links, select options) |
| `bg-destructive` / `text-destructive` | `--destructive` / `--destructive-foreground` | Errors, deletes |
| `bg-success` / `text-success` | `--success` / `--success-foreground` | Approved/active/credit |
| `bg-warning` / `text-warning` | `--warning` / `--warning-foreground` | Pending states |
| `border-border` | `--border` | All borders (`* { @apply border-border }` global default) |
| `border-input` | `--input` | Form control borders |
| `ring-ring` | `--ring` | Focus ring (= primary) |

### Actual values

Light (`:root`) brand blue is `--primary: 221 83% 53%` (= `#2563eb`-ish); dark (`.dark`) lifts it to `217 91% 61%` for contrast on the dark canvas. Light `--background` is a cool off-white (`210 25% 98%`); dark is a neutral-navy `222 24% 7%` with cards lifted to `222 22% 11%`. `--radius` is `0.75rem`; `borderRadius.lg/md/sm` derive from it (`var(--radius)`, `−2px`, `−4px`).

`success` / `warning` / `destructive` are **not** part of vanilla shadcn — they're added so `Badge`/`StatusBadge`/`StatCard` can express semantic status without per-component hex.

## Brand gradient & elevation (globals.css utilities)

Beyond the Tailwind colors, `globals.css` defines brand-specific `@utility` rules:

- `--brand-from` / `--brand-to` → `.bg-brand` (135° gradient), `.text-gradient` (clipped-text gradient logo), `.bg-grid` (gradient + radial mesh).
- Elevation tokens `--shadow-xs/sm/md/lg`, `--shadow-brand`, `--highlight` → utilities `.shadow-soft`, `.shadow-elevated`, `.shadow-float`, `.shadow-brand`, `.surface`. `Card` uses `shadow-soft`; the mobile drawer uses `shadow-float`; `StatCard accent` uses `shadow-brand`.
- `.skeleton` — `bg-muted` + animated shimmer `::after` (the `shimmer` keyframe). Backs the `Skeleton` primitive.
- `.tnum` — tabular-nums for money/points/metrics (used by `StatCard`, `DonutChart`).
- `.animate-float` — gentle hero float (disabled under `prefers-reduced-motion`).
- **Global themed scrollbar** (`globals.css`, applied on `*`, no opt-in class needed) — 8px, `--primary/0.5` thumb → `--primary/0.8` on hover, transparent track, `scrollbar-width: thin` for Firefox + `::-webkit-scrollbar` for Chromium/WebKit. Replaces the browser-default gray/black scrollbar everywhere (page body, sidebar nav, dialogs, popovers, tables). Structurally mirrors the sibling `pcplastic_app` project's global scrollbar (same selector shape, 8px, thin, transparent track) — the one deliberate difference is the thumb color: pcplastic uses `--border`/`--muted-foreground`, this app uses `--primary` per an explicit app-specific color choice. The former opt-in `.scrollbar-thin` utility (used only by the admin products multiselect picker) was removed as redundant once this went global.
- `.hide-scrollbar` — opt-out escape hatch (`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`), higher specificity than the global themed scrollbar so it wins wherever applied. Same pattern as pcplastic_app; not currently used anywhere in this app but available for a future scroll container that needs a fully hidden scrollbar.

- `.rich-text` — typography for admin-authored HTML (legal pages, rendered by `<RichText>`): headings/paragraph rhythm, lists, links, blockquote, code, images, and tables that scroll inside themselves (`display:block; width:max-content; overflow-x:auto`) instead of widening the page. Also maps Quill's own `ql-align-*` / `ql-indent-*` output classes. Stands in for a typography plugin (this project has none). **Duplicated verbatim in `the marketing site/src/app/globals.css`** — the marketing site renders the same content; keep both copies in sync.
- `.ql-*` overrides — re-skin `react-quill-new`'s `snow` stylesheet (imported by `<RichTextEditor>`) onto the semantic tokens: `--border` borders, `--muted` toolbar, `--popover` dropdowns/tooltip, `--primary` active toolbar icons, `--foreground` stroke/fill. Without these the vendor's hardcoded grays break dark mode.

## Status → variant color mapping

`StatusBadge` (`src/components/common/status-badge.tsx`) maps backend status strings to `Badge` variants, which resolve to these tokens:

| Badge variant | Classes | Tokens |
|---|---|---|
| `default` | `bg-primary/10 text-primary` | primary |
| `success` | `bg-success/10 text-success` | success |
| `warning` | `bg-warning/10 text-warning` | warning |
| `destructive` | `bg-destructive/10 text-destructive` | destructive |
| `secondary` | `bg-secondary text-secondary-foreground` | secondary |
| `outline` | `text-foreground` + border | foreground/border |

`StatCard` uses a parallel `TONE` map (`bg-{tone}/10` chip, `text-{tone}` icon, `ring-{tone}/40` attention ring) over the same `primary`/`success`/`warning`/`destructive` tokens.

## Spacing & typography conventions

- **Spacing** — standard Tailwind scale; shell padding is `p-4 sm:p-6`, cards `p-5`/`p-6`, form field groups `space-y-1.5`, nav items `py-2`.
- **Typography** — body sets `line-height: 1.6`, `letter-spacing: -0.011em`, OpenType `cv11`/`ss01`; headings tighten to `-0.02em` with `text-wrap: balance`. Sizes use Tailwind utilities (`text-sm` controls/body, `text-xs` hints/labels, `text-2xl`/`text-3xl` metrics). Numeric/metric text adds `.tnum`.
- **Radius** — `rounded-md` (controls/buttons), `rounded-lg` (nav links/tabs), `rounded-xl` (cards/dialogs), `rounded-full` (badges/avatars/switch).

## Anti-patterns

- ❌ `style={{ color: '#2563eb' }}` — use `text-primary`.
- ❌ `text-red-500` in feature code — use `text-destructive`.
- ❌ Hardcoding `#fff`/`#000` — use `text-foreground` / `bg-background`.
- ❌ Building class strings with template literals — use `cn(...)` so `twMerge` resolves conflicts.

### Documented exceptions to "semantic tokens only"

A small number of spots deliberately reach for a raw Tailwind color scale instead of a `--token`,
each called out where it lives (never silently):

- `DashboardShell` topbar avatar wrapper — hardcoded `bg-black dark:bg-white` (inverted backdrop for
  a transparent-background PNG), see `readme/ui/layout.md`.
- `common/message-status-ticks.tsx`'s `<MessageStatusTicks>` (member chat read-receipt tick,
  `readme/flows/messaging.md`) — `text-sky-500 dark:text-sky-400` when the thread's `seenByOther` is
  true, `text-muted-foreground` otherwise. "The blue tick" is a specific, recognizable status-color
  convention (like the read-tick blue on any DM app), not an app-brand color choice — still a plain
  Tailwind utility class, never inline `style` or a raw hex.

Both are narrow, named exceptions — don't generalize from them into hardcoding elsewhere.

## Reference

- `src/app/globals.css` — token definitions + brand/elevation utilities
- `postcss.config.mjs` — `@tailwindcss/postcss` (Tailwind v4)
- `src/lib/utils.ts` — `cn()` and `en-IN` formatters
- `readme/theming/dark-mode.md` — light/dark mechanics

*Last updated: 2026-10-20 (Tailwind 3 → 4: config moved into `globals.css` `@theme inline`, `tailwindcss-animate` → `tw-animate-css`, v3 `space-y`/button-cursor behaviour kept)*
*Previously: 2026-09-11 (documented the `text-sky-500`/`dark:text-sky-400` read-tick color as a
named exception to "semantic tokens only" — `common/message-status-ticks.tsx`, see
`readme/flows/messaging.md`)*
*Previously: 2026-07-24 (removed `formatPoints` from the `utils.ts` formatter list — wallet/points feature removed)*
*Previously: 2026-06-29*
