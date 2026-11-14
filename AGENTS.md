# AGENTS.md — bids-app

Guidance for coding agents. See `CLAUDE.md` for the hard rules and `PROJECT_STRUCTURE.md` for the layout.

- Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind 4, Radix/shadcn, zustand + TanStack Query, axios.
- Never run builds or start production servers; run `npm run check` before finishing.
- Reuse before writing: grep `src/components/common`, `src/components/ui`, `src/lib`, `src/hooks` first.
- Keep `bids-app` and `bids-api` contracts in sync: check the matching API route before wiring a new call.
- Update `readme/` / `docs/` when behaviour they describe changes (`docs/DOC_SYNC.md`).
- Do not commit secrets; `.env*` is git-ignored except `.env.example`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
