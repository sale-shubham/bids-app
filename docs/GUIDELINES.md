# GUIDELINES.md — Coding Standards

---

## API calls

- Always use `api` from `src/lib/api-client.ts` in browser code — never raw `fetch()` for a backend call, never `axios.create()` elsewhere.
- Import: `import { api, apiErrorMessage } from '@/lib/api-client'`
- Error messages: `apiErrorMessage(err)`, or the feature's wrapper that maps error codes to friendlier copy first (`auctionErrorMessage` in `auctions.errors.ts`, `authErrorMessage`, …) — never read `err.response.data.error.message` in components.
- Server components (public pages, `generateMetadata`, `sitemap.ts`) fetch through `serverFetch` in `src/lib/server-api.ts`, wrapped by `src/features/<feature>/<feature>.server.ts`. Never import it from a client component.
- The one deliberate `fetch()` from the browser is the presigned S3 upload in `src/features/uploads/uploads.api.ts`, which must go out without the API's credentials or headers.

```tsx
// ✓ correct
const res = await api.get('/auctions/mine', { params: { status } });

// ❌ wrong
const res = await fetch('/auctions/mine');
const res = await axios.get('/auctions/mine'); // raw axios
```

---

## Server vs Client Components

- **Server Components (default):** the public, SEO-facing pages in the `(public)` group: `/auctions`, `/auctions/[id]`, `/leaderboard`, `/sellers/[id]`, `/pages/[slug]`. They render inside `DashboardShell` through `PublicShell` (guest mode when logged out), which is the only client piece around them. The marketing pages (home, About, How it works, Contact) live in the separate `bids-website` repo, and `/` redirects to `/login`. They fetch on the server and export `metadata` / `generateMetadata`, then hand interactive parts (bid panel, filters, infinite lists) to client components. Thin pages that only render a client component (`/sell/new`, `/watchlist`, `/forgot-password`, `/reset-password`) stay server components too.
- **Client Components:** pages and components that need hooks, state, browser APIs or event handlers: the dashboards, forms, the signed-in areas, `/login`, `/signup`. Add `'use client'` at the top.

```tsx
// Client component
'use client';
import { useState } from 'react';
```

---

## Form handling

- `react-hook-form` + `@hookform/resolvers/zod` for all forms.
- Schema in `src/features/<feature>/<feature>.schema.ts`, with `z` imported from `@/lib/zod` (`readme/methods/zod-validation.md`).
- Display errors from `form.formState.errors` (e.g. `<FormInput error={errors.title?.message} />`) — never validate manually in submit.
- A server error that belongs to one field goes on that field with `form.setError` (as `ChangePasswordCard` does for a wrong current password), plus a toast.

---

## Data fetching

- `useQuery` / `useInfiniteQuery` for reads, `useMutation` for writes — all from `@tanstack/react-query`.
- Hook logic in `src/features/<feature>/use-<feature>.ts`.
- Never call `api` directly inside a component body or `useEffect`.
- Server data stays in the react-query cache; zustand (`src/store/`) holds client state only (auth, live socket status, recently viewed).

---

## Toast notifications

```tsx
import { toast } from 'sonner';

toast.success('Auction created');
toast.error(apiErrorMessage(err));
```

Never use `alert()` or custom toast implementations.

---

## Animations

Use the CSS animation wrappers in `src/components/common/motion.tsx` (`tw-animate-css` classes) and the keyframe utilities in `globals.css` (`.animate-price-flash`, `.animate-row-in`). framer-motion is not installed — don't add an animation library for an enter/fade effect CSS can do.

---

## Theming

- Semantic Tailwind classes: `text-foreground`, `bg-background`, `text-muted-foreground`, `border-border`, `text-destructive`.
- No hardcoded hex (`#fff`, `#000`), no arbitrary colour values (`text-[#abc]`), no `text-gray-500`. The brand colours (purple, pink, amber) are tokens in `globals.css`; the few raw-palette spots that exist today are listed in `readme/theming/tokens.md`.
- Theme switching: `next-themes` — `useTheme()` hook or `<ThemeToggle>` component.

---

## TypeScript

- `strict: true` — no `any` without a comment explaining why.
- Infer types from zod schemas: `z.infer<typeof schema>` — no manual type duplication.
- No `as any` or `// @ts-ignore` without justification.

---

## Empty states

Use `<EmptyState>` from `src/components/common/empty-state.tsx` for all empty list views — never render nothing or a plain text string.

---

## Status badges

Use `<StatusBadge>` from `src/components/common/status-badge.tsx` for status labels (member, commission and payment statuses), and `<AuctionStatusBadge>` from `src/features/auctions/components/auction-card.tsx` for an auction's status — never roll inline coloured `<span>` tags.

---

## File naming conventions

- Components: `kebab-case.tsx`, exporting the PascalCase component (`confirm-dialog.tsx` → `ConfirmDialog`)
- Hooks: `use-<name>.ts` (`use-auctions.ts`, `use-is-narrow-content.ts`)
- Feature files: `<feature>.api.ts`, `<feature>.schema.ts`, `<feature>.types.ts`, `<feature>.parse.ts` (response decoding), `<feature>.errors.ts` (error-code copy), `<feature>.server.ts` (server-side fetches)
- Tests: `*.test.ts` / `*.test.tsx` next to the file they test
- Constants: `SCREAMING_SNAKE_CASE` values, `kebab-case` files (`src/constants/routes.ts`, `legal.ts`)
