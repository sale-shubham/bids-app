import { readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { API_URL, BASE_URL, assertLocalStack } from './lib/env.ts';
import { apiContext, login, ping } from './lib/api.ts';
import { createMember, sweep, type DbRole } from './lib/db.ts';
import { RUN_DIR, newRunId, saveState, storageStatePath, testEmail, type RunState, type TestRole } from './lib/run.ts';
import { SUPPRESS_PROMPTS } from './lib/ui.ts';

const ROLES: Record<TestRole, DbRole> = { admin: 'SUPER_ADMIN', auctioneer: 'MEMBER', bidderA: 'MEMBER', bidderB: 'MEMBER' };

// Servers are started separately (npm run dev in bids-api and bids-app). Setup
// checks both answer, then creates this run's members straight in the DB and signs
// each in through the API so specs can reuse the cookies as storage state.
export default async function globalSetup() {
  assertLocalStack();
  if (!(await ping(`${API_URL.replace(/\/+$/, '')}/health`)) && !(await ping(API_URL))) {
    throw new Error(`API not reachable at ${API_URL}. Start it first: cd ../bids-api && npm run dev (EMAIL_DRIVER=stub, PAYMENT_DRIVER=stub).`);
  }
  if (!(await ping(BASE_URL))) throw new Error(`App not reachable at ${BASE_URL}. Start it first: npm run dev.`);

  rmSync(RUN_DIR, { recursive: true, force: true });
  mkdirSync(RUN_DIR, { recursive: true });

  // Leftovers from runs that died before teardown (2 h is far past any run).
  const swept = await sweep({ olderThanMinutes: 120 });
  if (swept.members) console.log(`[e2e] swept stale data: ${JSON.stringify(swept)}`);

  const runId = newRunId();
  const members = {} as RunState['members'];
  for (const [role, dbRole] of Object.entries(ROLES) as [TestRole, DbRole][]) {
    const email = testEmail(runId, role.toLowerCase());
    const name = `E2E ${runId} ${role}`;
    const m = await createMember({ email, name, role: dbRole });
    members[role] = m;

    const ctx = await apiContext();
    await login(ctx, email);
    await ctx.storageState({ path: storageStatePath(role) });
    await ctx.dispose();
    suppressPrompts(storageStatePath(role));
  }
  saveState({ runId, members });
  console.log(`[e2e] run ${runId}: ${Object.keys(members).length} members created`);
}

// The push-permission / install prompts are toasts that cover whatever a test clicks next.
function suppressPrompts(statePath: string) {
  type State = { cookies: unknown[]; origins?: { origin: string; localStorage: { name: string; value: string }[] }[] };
  const state = JSON.parse(readFileSync(statePath, 'utf8')) as State;
  const origin = new URL(BASE_URL).origin;
  state.origins = [...(state.origins ?? []).filter((o) => o.origin !== origin), { origin, localStorage: SUPPRESS_PROMPTS.map(([name, value]) => ({ name, value })) }];
  writeFileSync(statePath, JSON.stringify(state));
}
