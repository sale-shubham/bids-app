# Dark mode

Theme mode = `light` | `dark` | `system`. The mechanism is **`next-themes`** (hard rule 7) — it owns the `light`/`dark` class on `<html>`, persists the choice to localStorage, and resolves `system` from the OS preference. There is no custom theme store.

## Files

- `src/providers/index.tsx` — mounts `<ThemeProvider>` (next-themes)
- `src/app/layout.tsx` — `<html suppressHydrationWarning>` so the injected class doesn't trip hydration
- `src/components/common/theme-toggle.tsx` — the toggle button
- `src/app/globals.css` — `:root` (light) + `.dark` (dark) variable blocks
- `src/app/globals.css` — also `@custom-variant dark (&:is(.dark *))`, Tailwind 4's class-based dark mode

## next-themes setup

`Providers` (`src/providers/index.tsx`) wraps the app — react-query, then theme, then the auth bootstrap + toaster:

```tsx
<QueryClientProvider client={queryClient}>
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <AuthBootstrap>{children}</AuthBootstrap>
    <Toaster richColors closeButton position="top-right" />
  </ThemeProvider>
</QueryClientProvider>
```

- `attribute="class"` — next-themes writes `class="light"` or `class="dark"` on `<html>` (matches the `@custom-variant dark` in `globals.css`).
- `defaultTheme="system"` + `enableSystem` — first load follows the OS `prefers-color-scheme` and tracks live changes; `system` is an explicit, persisted choice.
- `disableTransitionOnChange` — suppresses CSS transitions during the swap so colors don't animate when toggling.
- `Providers` is mounted in the **root layout**, so theming covers every route group (marketing, auth, member, admin).

`<html suppressHydrationWarning>` in `src/app/layout.tsx` is required because next-themes sets the class on the client before React hydrates.

## theme-toggle.tsx mechanics

`src/components/common/theme-toggle.tsx`:

```tsx
const { setTheme, resolvedTheme } = useTheme();
const [mounted, setMounted] = React.useState(false);
React.useEffect(() => setMounted(true), []);
if (!mounted) return <Button variant="ghost" size="icon" aria-label="Toggle theme" />;
return (
  <Button variant="ghost" size="icon" aria-label="Toggle theme"
    onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
    {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
  </Button>
);
```

- **Mount guard** — `resolvedTheme` is unknown during SSR, so the component renders an empty ghost button until `mounted`, then renders the real icon. This prevents a hydration mismatch (server can't know the client's theme).
- **Two-way flip** — `onClick` toggles `light ↔ dark` via `resolvedTheme` (the actually-applied mode). It does **not** cycle into `system`; `system` is only the initial default. Sun icon shows in dark mode (tap → light), Moon in light mode (tap → dark).
- **Placement** — only in shell chrome: `DashboardShell` topbar (desktop + mobile). Never per-page. (The marketing site's own `PublicNavbar` toggle now lives in the separate `the marketing site` repo.) See `readme/ui/layout.md`.

## CSS variable / class strategy

`globals.css` declares `@custom-variant dark (&:is(.dark *))`, so every `dark:`-aware utility and every semantic color reacts to the `.dark` class on the `<html>` ancestor. `globals.css` defines the same variable names in two blocks:

```css
@layer base {
  :root {            /* light */
    --background: 210 25% 98%;
    --foreground: 222 47% 11%;
    --primary: 221 83% 53%;
    /* ... */
  }
  .dark {            /* dark */
    --background: 222 24% 7%;
    --foreground: 210 20% 98%;
    --primary: 217 91% 61%;
    /* ... */
  }
}
```

Because every component styles via semantic tokens (`bg-background`, `text-foreground`, `bg-card`, `border-border`, `bg-primary/10`, …) and `@theme inline` resolves those to `hsl(var(--token))`, **switching the `.dark` class re-points the variables and the whole UI recolors** — no per-component branching. Dark mode also retunes brand/elevation tokens: `--brand-from/to` shift, and `--shadow-*` cast darker while a `--highlight` inset top-line lifts raised surfaces.

## Component rules

- Use semantic Tailwind classes (`bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`) — they switch with the mode automatically.
- Reach for the `dark:` variant only for one-off cases a token can't express (rare).
- Never hardcode `#fff`/`#000` — use `text-foreground` / `bg-background`.
- Read/derive theme via next-themes `useTheme()` — never inspect `document.documentElement.classList`.
- Test every new component in both modes (use the topbar/navbar toggle during dev).

## Adding a new themed surface

1. Define the variable in **both** `:root` and `.dark` in `src/app/globals.css` (HSL triplet).
2. Map it to a Tailwind color in the `@theme inline` block of `globals.css` as `--color-<name>: hsl(var(--token))`.
3. Reference it via the semantic class in components.
4. Verify light + dark + system.

## Anti-patterns

- ❌ Branching JS on the theme value to pick a color — let the CSS variables do it.
- ❌ Forgetting a `.dark` block for a new variable → dark mode looks broken.
- ❌ Rendering the toggle icon before `mounted` → hydration mismatch (the mount guard exists for this).
- ❌ Mounting `ThemeToggle` inside a page instead of shell chrome.

## Reference

- `src/providers/index.tsx`
- `src/app/layout.tsx`
- `src/components/common/theme-toggle.tsx`
- `src/app/globals.css`

*Last updated: 2026-10-20 (Tailwind 4: `darkMode: 'class'` in `tailwind.config.ts` became `@custom-variant dark` in `globals.css`; config file deleted)*
*Previously: 2026-06-29*
