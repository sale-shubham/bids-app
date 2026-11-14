# GUIDELINES.md — Coding Standards

---

## API calls

- Always use `api` from `src/lib/api-client.ts` — never raw `fetch()`, never raw `axios.create()` elsewhere.
- Import: `import { api, apiErrorMessage } from '@/lib/api-client'`
- Error messages: `apiErrorMessage(err)` — never access `err.response.data.error.message` directly in components.

```tsx
// ✓ correct
const res = await api.get('/listings');

// ❌ wrong
const res = await fetch('/listings');
const res = await axios.get('/listings'); // raw axios
```

---

## Server vs Client Components

- **Server Components (default):** `(auth)` pages. No hooks, no state. Good for SEO. (Marketing pages moved to the separate `the marketing site` repo.)
- **Client Components:** member/admin pages that need hooks, state, or event handlers. Add `'use client'` at the top.

```tsx
// Client component
'use client';
import { useState } from 'react';
```

---

## Form handling

- `react-hook-form` + `@hookform/resolvers/zod` for all forms.
- Schema in `src/features/<feature>/<feature>.schema.ts`.
- Display errors from `form.formState.errors` — never validate manually in submit.

---

## Data fetching

- `useQuery` for reads, `useMutation` for writes — both from `@tanstack/react-query`.
- Hook logic in `src/features/<feature>/use-<feature>.ts`.
- Never call `api` directly inside a component body or useEffect.

---

## Toast notifications

```tsx
import { toast } from 'sonner';

toast.success('Listing created');
toast.error(apiErrorMessage(err));
```

Never use `alert()` or custom toast implementations.

---

## Animations

Use the CSS animation wrappers in `src/components/common/motion.tsx` (`tw-animate-css` classes). framer-motion is not installed — don't add an animation library for an enter/fade effect CSS can do.

---

## Theming

- Semantic Tailwind classes: `text-foreground`, `bg-background`, `text-muted-foreground`, `border-border`, `text-destructive`.
- No hardcoded hex (`#fff`, `#000`), no arbitrary Tailwind values (`text-[#abc]`), no `text-gray-500`.
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

Use `<StatusBadge>` from `src/components/common/status-badge.tsx` for all status labels — never roll inline colored `<span>` tags.

---

## File naming conventions

- Components: `PascalCase.tsx`
- Hooks / utilities: `kebab-case.ts` or `camelCase.ts`
- API files: `<feature>.api.ts`
- Hooks: `use-<feature>.ts`
- Schemas: `<feature>.schema.ts`
- Constants: `SCREAMING_SNAKE_CASE` values, `kebab-case` files
