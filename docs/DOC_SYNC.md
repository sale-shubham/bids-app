# DOC_SYNC.md — Documentation Update Trigger Matrix

Read this before any code change. It defines exactly which docs to update for each type of change.

---

## Additions

| What you add | Docs to update |
|---|---|
| New feature/module | Create `readme/flows/<feature>.md` + register row in `CLAUDE.md` README registry |
| New shared hook or utility | Update `readme/methods/<domain>.md` (create if new domain) |
| New common component | Update `readme/ui/components.md` |
| New layout component | Update `readme/ui/layout.md` |
| New route group or page | Update `readme/flows/<area>.md` (admin/member/marketing match) |
| New environment variable | Update `readme/methods/api-client.md` + `.env.example` |
| New confirmable action | Add row to `docs/CONFIRM_DIALOG.md` "Live reference files" |
| New Tailwind token or CSS var | Update `readme/theming/tokens.md` |
| New zod schema | Update `readme/flows/<feature>.md` under Form Validation section |
| New API endpoint (client-side) | Update `readme/methods/api-client.md` or `readme/flows/<feature>.md` |
| New Zustand store slice | Update `readme/methods/stores.md` |

## Modifications

| What you modify | Docs to update |
|---|---|
| Feature business logic | `readme/flows/<feature>.md` — Steps / Data Pathways section |
| Shared utility function signature | `readme/methods/<domain>.md` — Methods section |
| Common component props/API | `readme/ui/components.md` |
| Layout component | `readme/ui/layout.md` |
| Theme tokens / palette | `readme/theming/tokens.md` |
| Responsive behaviour of a page body or shared component | `docs/CONTAINER_QUERIES.md` (if the rule, mapping or an exception changes) + `readme/ui/components.md` |
| Pagination defaults | `docs/PAGINATION.md` |
| Confirm dialog pattern | `docs/CONFIRM_DIALOG.md` |
| CRUD pattern | `docs/CRUD_PATTERN.md` |
| Auth flow | `readme/flows/auth.md` |
| Leads flow | `readme/flows/leads.md` |
| Plans / subscription flow | `readme/flows/plans.md` |
| Listing flow | `readme/flows/listings.md` |
| Admin flow | `readme/flows/admin.md` |
| Search flow | `readme/flows/search.md` |
| `package.json` dependency version | `PROJECT_STRUCTURE.md` Framework Versions table |
| `.gitignore` | `.claudeignore` (keep in sync) |

## Removals

| What you remove | Docs to update |
|---|---|
| Feature/module | Remove `readme/flows/<feature>.md` + remove row from `CLAUDE.md` registry |
| Shared utility | Update `readme/methods/<domain>.md` — remove method entry |
| Common component | Update `readme/ui/components.md` — remove entry |
| Confirmable action | Remove row from `docs/CONFIRM_DIALOG.md` |
| Environment variable | Update `readme/methods/api-client.md` + `.env.example` |

---

## Hard rule

A PR that edits source code without a matching doc update is **incomplete**. The Stop hook enforces this automatically — it blocks turn-end and lists the files that need documentation.
