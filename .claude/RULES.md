# .claude/RULES.md — Standing Instructions

Read this file at the start of every session.
These rules apply to every task in this repository without exception.
No need to re-state them in a prompt — they are always active.

---

## 1. Documentation sync (mandatory)

- All documentation lives in the `readme/` directory at the project root.
- Before touching a file in any directory, read the corresponding flow-specific README in `readme/` (e.g., `readme/flows/bidding.md` for bid panel logic).
- After any code change, update the corresponding flow-specific README in `readme/`.
- After adding a new feature or flow, update the relevant flow doc or create a new one in `readme/flows/` and register it in `CLAUDE.md`.
- `CLAUDE.md` itself must be updated whenever a new flow README is added.
- **No per-directory or per-module READMEs**: do not create `README.md` files in inner folders or for individual modules. All documentation must focus on flows and patterns in `readme/`.
- **Enforced by hook (not optional).** A `Stop` hook (`.claude/hooks/check-readme-sync.sh`, wired in `.claude/settings.json`) blocks turn-end when source code was edited in a session but no `readme/` doc was updated. The `PostToolUse` hook `.claude/hooks/log-edit.sh` records edits to `.claude/.session-edits.log`; `SessionStart` clears it. When it fires, run the `readme-sync` skill checklist and update the matching `readme/` doc (or state why none applies). Full matrix: `docs/DOC_SYNC.md`.

---

## 2. Package hygiene

- Never add two packages that solve the same problem.
  - HTTP client: **axios** only — use `api` from `src/lib/api-client.ts`; never raw `axios.create()` elsewhere.
  - Validation: **zod** only (not joi, yup, valibot).
  - State: **zustand** only (not redux, jotai, recoil).
  - Data fetching: **@tanstack/react-query** only (not swr, useSWR).
  - Date/time: **date-fns** only (not moment, dayjs, luxon).
- Do not modify `package.json` without explicit instruction.
- After adding a package, document it in the relevant `readme/methods/<domain>.md`.

---

## 3. Git workflow

### Default branches
Every repository starts with exactly two long-lived branches:
- `main` — production-ready, protected
- `dev` — integration branch; all features merge here first

### Starting a new feature
1. Check out from `dev`: `git checkout dev && git pull origin dev`
2. Create a feature branch: `git checkout -b feature/<name>`
3. If `feature/<name>` already exists locally or remotely, use `feature/<name>-2` (increment until unique).
4. Work on the feature branch only.

### Committing
- **Never commit on behalf of the user.** After completing code changes, stop and let the user review the diff before committing. Do not run `git commit` or `git push` unless the user explicitly says "commit" or "push".
- Write conventional commit messages: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`
- Include a short body describing *why*, not just *what*.

### Pull requests
- Target branch is always `dev` (never `main` directly).
- PR title format: `[TYPE] Short description` — e.g. `[feat] Add category filter to auction browse`
- PR description must include:
  - **Summary** — what changed and why
  - **Changes** — bullet list of files/modules affected
  - **Testing** — how to verify the change
  - **Related ticket** — link if applicable
- **Never self-merge.** Leave the PR open for human review.
- Do not delete the branch after PR creation.

---

## 4. PR review instructions

PR/diff review runs through the plugins enabled in `.claude/settings.json` (code-review, pr-review-toolkit, feature-dev, commit-commands, frontend-design). Do NOT hand-roll a custom review format.

1. **Primary:** run `/code-review` (confidence-scored, multi-agent) for any PR or working-tree diff.
2. **Deeper pass:** use `/review-pr` (pr-review-toolkit) to invoke specialized agents — silent-failure-hunter, type-design-analyzer, pr-test-analyzer, comment-analyzer, code-simplifier.
3. **Project-specific gates (always check, plugins don't know these):**
   - Anything that does not match the project's existing implementation style.
   - Missing README/doc updates per the doc-sync policy (§1).
   - Hard rules in §10 (confirm dialogs, `api` client, zod, auth guard, theming).
4. **Do not approve or request changes on behalf of the reviewer** — summarise only.

---

## 5. GitHub tickets

When asked to create a ticket (GitHub issue):
- Title: concise, action-oriented (`Add pagination to /admin/members endpoint`)
- Body must include: **Context**, **Acceptance criteria**, **Notes** (optional)
- Apply labels if the project's label set is known (bug, enhancement, chore, etc.)
- When creating a PR for work that has a ticket, link the issue using `Closes #<issue-number>` or `Relates to #<issue-number>`.

---

## 6. Code style

- Follow the existing pattern in the file you are editing.
- Do not introduce a new pattern or library without noting it in the relevant README.
- Prefer explicit over clever.
- No commented-out code left in commits.
- TypeScript: strict mode; no `any` unless unavoidable and documented.
- Add `'use client'` at the top of any file that uses React hooks, browser APIs, or event handlers. Server Components are the default in Next.js App Router.
- Keep Server Components for the public SEO pages (`src/app/(public)/`: auctions, detail, leaderboard, sellers, legal pages; they pass data into client children). Use Client Components for interactive UI (dashboards, forms, member area). The app has no marketing pages: those live in the separate `bids-website` repo and the app links to them with absolute `<a href>` from `src/constants/website.ts` (`NEXT_PUBLIC_WEBSITE_URL`).
- **Reuse before creating.** Before writing a new component, hook, or util, search `src/components/common/`, `src/components/ui/`, `src/lib/`, and the relevant `src/features/<feature>/use-<feature>.ts` for one that already does the job (e.g. `<ConfirmDialog>`, `<ResponsiveList>`, `<EmptyState>`, `<Countdown>`, `<InfiniteScroll>`, `formatINR` / `formatDate` in `lib/utils.ts`, `apiErrorMessage`). Only write a new one if nothing fits — and if the need is generic (not one-page-specific), add it to `components/common`/`ui`/`lib` rather than inlining it in the page. Never duplicate an existing component/util under a new name or copy-paste its logic into a page.

---

## 7. Environment and config

- Never hard-code secrets, API keys, or environment-specific values.
- All config goes through environment variables — `NEXT_PUBLIC_*` for client-visible, bare `*` for server-only.
- New environment variables must be documented in `readme/methods/api-client.md` and added to `.env.example`.
- API base URL: `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:4000`, logic in `src/constants/api.ts`). Two modes: an absolute API URL on the app's parent domain (browser calls the API cross-origin with cookies; API CORS allows the origin), or `/api` with `API_PROXY_TARGET`, where `next.config.ts` rewrites `/api/*` to the API (used before a custom domain exists).

---

## 8. Testing

- New features require at least a unit test for the service/util layer.
- Bug fixes require a regression test.
- Do not remove existing tests.
- For UI testing, use the `webapp-testing` skill (Playwright-based).

---

## 9. Session bootstrap

`CLAUDE.md` points here; read this file at the start of every session. Hooks in `.claude/settings.json`: `SessionStart` clears `.claude/.session-edits.log`; `PostToolUse` logs edits (`log-edit.sh`); `Stop` runs `check-readme-sync.sh`, `quality-gate.sh` and `e2e-reminder.sh`.

---

## 10. App-specific hard rules (bids-app)

- **Confirmation dialogs (MANDATORY)** — every destructive / irreversible / consequential action MUST use `<ConfirmDialog>` from `src/components/common/confirm-dialog.tsx`. No `window.confirm`, no inline `<AlertDialog>` for confirms, no direct mutation on click. Actions requiring confirmation include: placing a bid, deleting an auction, cancelling an auction, activating / deactivating a member or changing its role, waiving a commission (admin), logging out (one or all devices), removing a device. Full spec: `docs/CONFIRM_DIALOG.md`.

- **API calls** — every backend call goes through the `api` axios instance from `src/lib/api-client.ts`. It handles JWT bearer injection, single-flight 401 refresh, and error normalisation. Never import raw `axios` elsewhere for API calls. Never use `fetch()` for backend calls. Correct: `import { api } from '@/lib/api-client'`.

- **Error display** — use `apiErrorMessage(err)` from `src/lib/api-client.ts` to normalise API errors for toast/UI. Never access `error.response.data` directly.

- **Form validation** — zod schemas in `src/features/<feature>/<feature>.schema.ts`. Wire via react-hook-form + `@hookform/resolvers/zod`. Never validate manually in submit handlers.

- **State** — Zustand store for auth: `src/store/auth-store.ts`. Do not store server data in Zustand — use react-query cache for that.

- **Auth guard** — use `<AuthGuard>` from `src/components/common/auth-guard.tsx` for protecting routes. Never write custom redirect-to-login logic in page components.

- **Data fetching** — use react-query `useQuery` for reads and `useMutation` for writes. Never `fetch()` or `api()` directly inside components. Hook logic lives in `src/features/<feature>/use-<feature>.ts`.

- **Theming** — semantic Tailwind classes (`text-foreground`, `bg-background`, `text-muted-foreground`, `border-border`). No hardcoded hex, no `text-gray-500`. Theme switching via `next-themes` + `<ThemeToggle>` from `src/components/common/theme-toggle.tsx`.

- **Toast notifications** — use `sonner` (`toast.success()`, `toast.error()`). Never use `alert()` or custom toast implementations.

- **Responsive rules inside a page body** — container variants (`@lg/content:`, `@2xl/content:`, `@3xl/content:`; `@sm/content:` inside a dialog), never a bare `sm:`/`md:`/`lg:`. The desktop sidebar is 0 or 256px wide on the member's own toggle, so a viewport breakpoint can't tell a page how much room it has. A list's table/cards switch is a container query too (`ResponsiveList` / `MobileSortControl` at `@3xl/content`), and its data side `useIsNarrowContent()` measures the same box. Viewport breakpoints only for chrome/device choice, overlay widths, and components also mounted outside `DashboardShell`. Full spec: `docs/CONTAINER_QUERIES.md`.

### Pre-PR grep audit

```bash
grep -rn "window\.confirm" src/        # must be 0
grep -rn "onClick={.*delete\|onClick={.*Delete" src/  # must use ConfirmDialog
grep -rn "import axios from 'axios'" src/  # must be 0 (use api from api-client)
grep -rn "fetch('" src/                # must be 0 for backend calls
```

---

## 11. Reuse audit (grep before writing new code)

Before adding a component/hook/util, check it doesn't already exist under a different name:

```bash
grep -rn "export function <Name>\|export const <name>" src/components/ src/lib/ src/features/
```

If something close already exists, extend or parameterize it instead of adding a near-duplicate.

---

## 12. Cross-layer / cross-repo impact check (mandatory)

`bids-app` (this repo) and `bids-api` (the backend, sibling directory `../bids-api`) are two halves of one contract. Before implementing ANY change that assumes the other side does something — a new request param, a response field, a header, a websocket event, a query param the caller expects to be honored — **check the other repo's actual code first**, not after the user notices it doesn't work.

- Frontend sends a new query param / body field expecting server behavior (filtering, sorting, a new response shape)? Grep the matching `bids-api` controller/service/route **before** wiring it, to confirm it reads and acts on that param. If it doesn't, either implement both sides in the same change, or tell the user up front "backend doesn't support this yet" and ask whether to add it there too — never silently ship a frontend-only half of a two-sided contract and report it as done.
- Backend changes a response shape, adds/removes a field, or changes status codes? Grep `bids-app`'s `src/features/*/​*.api.ts` and the hooks that consume it before merging, so the frontend types/usages aren't left silently stale.
- This applies whenever the user says "change the frontend" or "change the backend" as a standalone instruction — treat it as a project-wide task, not a single-repo task. Check the other side's actual code for impact before claiming the feature works end-to-end.
- "I haven't verified the other side" is not an acceptable thing to discover after the fact — verify during the same task, before telling the user the change is complete.

---

*Last updated: 2026-11-15*
