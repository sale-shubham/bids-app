# Testing

Two layers, deliberately separate.

| | Unit / component | E2E |
| --- | --- | --- |
| Tool | vitest + jsdom + Testing Library | Playwright (`e2e/`, own `package.json`) |
| Needs servers | no | yes: `bids-api` and the app, started by hand |
| Runs in `npm run check` / CI | yes | no (main session / developer runs it) |
| Covers | parsers, reducers, schemas, error maps, stores, route gating, countdown, bid panel, auction card, watch button | signup/login/reset, browse, bidding between two users, auction close + commission payment, admin, mobile |

## Unit tests

- `npm test` (once), `npm run test:watch`, `npm run test:coverage` (text summary + `coverage/` HTML, gitignored).
- `npm run check` = lint + typecheck + test. `dev_build.yml` runs it, so a failing test blocks the PR.
- Config: `vitest.config.mts` (jsdom, `@/*` alias, `src/test/setup.ts` loads jest-dom and cleans up the DOM). `e2e/` is excluded.
- Files sit next to the code: `foo.ts` -> `foo.test.ts(x)`. Logic that is pure lives in `*.parse.ts`, `*.reducers.ts`, `*.utils.ts`,
  `*.schema.ts`, `*.errors.ts`, `*.filters.ts`, `constants/routes.ts`: test those first, they are cheap and catch most regressions.

Conventions:

- Test behaviour, not snapshots. Assert on what a user or the next layer sees (text, paise values, URL params).
- Parsers must be tolerant: always include a junk-input case (`null`, `{}`, wrong types) and the documented defaults.
- Time: `vi.useFakeTimers()` + `vi.setSystemTime(...)`; build relative dates from `Date.now()`. The countdown shares one interval, so assert
  `vi.getTimerCount()` returns to 0 after unmount.
- Zustand stores: reset with `setState` in `beforeEach`. For persisted stores, remember `setState` also writes storage.
- Components: mock the data hooks (`vi.mock('../use-bids', ...)`), `next/image`, `sonner`, `next/navigation`; wrap in a `QueryClientProvider` only
  when the component calls `useQueryClient`. Put auth state in with `useAuthStore.setState({ member, initialized })`.
- Money is always paise in data and `formatINR` in text (`₹1,250.50`).
- API errors in tests: build an `AxiosError` with `response.data = { success: false, error: { code, message, details } }`.

## E2E

See `e2e/README.md` for prerequisites (both dev servers, `EMAIL_DRIVER=stub`, `PAYMENT_DRIVER=stub`), commands and cleanup.

- The suite runs against the dev DB with throwaway members `e2e+<run>-<role>@noblebid.test`; auctions are inserted by `e2e/lib/db.ts`
  (images must be under the API's media base). Teardown deletes everything by the run id.
- Specs choose their identity with `test.use({ storageState: storageStatePath('bidderA') })` or by opening extra contexts.
- Anything slow (waiting on the 60 s close job) calls `test.slow()`; write bids into the DB with `seedBid` when anti-sniping would delay the close.
- Prefer role/label selectors (`getByRole`, `getByLabel`) over CSS; the app's inputs carry labels and ARIA names for exactly this.
- Never point it at a non-local host: `assertLocalStack()` refuses.
