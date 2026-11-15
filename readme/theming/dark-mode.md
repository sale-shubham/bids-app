# Dark mode

Theme mode = `light` | `dark` | `system`. The mechanism is **`next-themes`**: it owns the `light`/`dark` class on `<html>`, persists the choice to localStorage, and resolves `system` from the OS preference. There is no custom theme store.

## Files

- `src/providers/index.tsx` — mounts `<ThemeProvider>` (next-themes)
- `src/app/layout.tsx` — `<html suppressHydrationWarning>` so the injected class doesn't trip hydration
- `src/components/common/theme-toggle.tsx` — the toggle button
- `src/components/layout/more-page.tsx` — the Profile page's App tab Theme row (the phone-width control)
- `src/app/globals.css` — `:root` (light) + `.dark` (dark) variable blocks, and `@custom-variant dark (&:is(.dark *))`, Tailwind 4's class-based dark mode

## next-themes setup

`Providers` (`src/providers/index.tsx`) wraps the app: react-query, then theme, then tooltips, the auth bootstrap, the live socket and the toaster:

```tsx
<QueryClientProvider client={queryClient}>
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <TooltipProvider delayDuration={200}>
      <AuthBootstrap>
        <LiveSocketProvider>{children}</LiveSocketProvider>
      </AuthBootstrap>
      <Toaster richColors closeButton position="top-right" />
    </TooltipProvider>
  </ThemeProvider>
</QueryClientProvider>
```

- `attribute="class"` — next-themes writes `class="light"` or `class="dark"` on `<html>` (matches the `@custom-variant dark` in `globals.css`).
- `defaultTheme="system"` + `enableSystem` — first load follows the OS `prefers-color-scheme` and tracks live changes.
- `disableTransitionOnChange` — suppresses CSS transitions during the swap so colours don't animate when toggling.
- `Providers` is mounted in the **root layout**, so theming covers every route: public pages, auth, and the member, bidder, auctioneer and admin areas.

`<html suppressHydrationWarning>` in `src/app/layout.tsx` is required because next-themes sets the class on the client before React hydrates.

## theme-toggle.tsx mechanics

`src/components/common/theme-toggle.tsx`:

```tsx
const { setTheme, resolvedTheme } = useTheme();
const mounted = useHydrated();
if (!mounted) return <Button variant="ghost" size="icon" aria-label="Toggle theme" />;
return (
  <Button variant="ghost" size="icon" aria-label="Toggle theme"
    onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
    {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
  </Button>
);
```

- **Mount guard** — `resolvedTheme` is unknown during SSR, so the component renders an empty ghost button until `useHydrated()` (`src/hooks/use-client-state.ts`, a `useSyncExternalStore` that is false on the server and during hydration) turns true, then renders the real icon. This prevents a hydration mismatch.
- **Two-way flip** — `onClick` toggles `light ↔ dark` via `resolvedTheme` (the applied mode). It does **not** cycle into `system`; `system` is only the initial default. Sun shows in dark mode (tap → light), Moon in light mode (tap → dark).
- **Placement** — only in shared chrome: the `DashboardShell` topbar (from `md` for a signed-in member, at every width for a guest on a public page). Never per page. On a phone inside the dashboard, the Profile page's App tab has a **Theme** row that calls the same `setTheme` (also guarded by `useHydrated()`). See `readme/ui/layout.md`.

## CSS variable / class strategy

`globals.css` declares `@custom-variant dark (&:is(.dark *))`, so every `dark:` utility and every semantic colour reacts to the `.dark` class on `<html>`. It defines the same variable names in two blocks:

```css
@layer base {
  :root {            /* light */
    --background: 270 25% 98%;
    --foreground: 222 47% 11%;
    --primary: 262 83% 58%;   /* #7C3AED */
    /* ... */
  }
  .dark {            /* dark */
    --background: 222 24% 7%;
    --foreground: 210 20% 98%;
    --primary: 262 90% 66%;
    /* ... */
  }
}
```

Because components style via semantic tokens (`bg-background`, `text-foreground`, `bg-card`, `border-border`, `bg-primary/10`, …) and `@theme inline` resolves those to `hsl(var(--token))`, **switching the `.dark` class re-points the variables and the whole UI recolours**, with no per-component branching. Dark mode also retunes the brand and elevation tokens: `--brand-from`/`--brand-to` lighten, `--warning-foreground` turns near-black for contrast on the brighter amber, the `--shadow-*` values cast darker, and a faint `--highlight` inset top line lifts raised surfaces. Full values: `readme/theming/tokens.md`.

## Component rules

- Use semantic Tailwind classes (`bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`); they switch with the mode automatically.
- Reach for the `dark:` variant only for one-off cases a token can't express (today only `OtpStep`'s "Verified" state uses it).
- Never hardcode `#fff`/`#000`; use `text-foreground` / `bg-background`.
- Read the theme via next-themes `useTheme()`; never inspect `document.documentElement.classList`.
- Test every new component in both modes (use the header toggle during dev).

## Adding a new themed surface

1. Define the variable in **both** `:root` and `.dark` in `src/app/globals.css` (HSL triplet).
2. Map it to a Tailwind colour in the `@theme inline` block of `globals.css` as `--color-<name>: hsl(var(--token))`.
3. Reference it via the semantic class in components.
4. Verify light + dark + system.

## Anti-patterns

- ❌ Branching JS on the theme value to pick a colour; let the CSS variables do it.
- ❌ Forgetting a `.dark` block for a new variable; dark mode then looks broken.
- ❌ Rendering the toggle icon before it is hydrated; that is a hydration mismatch (the mount guard exists for this).
- ❌ Mounting `ThemeToggle` inside a page instead of shared chrome.

## Reference

- `src/providers/index.tsx`
- `src/app/layout.tsx`
- `src/components/common/theme-toggle.tsx`
- `src/hooks/use-client-state.ts` (`useHydrated`)
- `src/app/globals.css`

*Last updated: 2026-11-15 (NobleBid token values, current provider tree, `useHydrated` mount guard, toggle placement in the `DashboardShell` topbar)*
