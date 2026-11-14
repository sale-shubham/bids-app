import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Every record the suite creates carries the run id in the member email
// (e2e+<run>-<role>@noblebid.test) so teardown finds it and crashed or parallel
// runs never touch each other's (or real) data.
export const E2E_EMAIL_PREFIX = 'e2e+';
export const E2E_EMAIL_DOMAIN = '@noblebid.test';

const here = dirname(fileURLToPath(import.meta.url));
export const RUN_DIR = join(here, '..', '.run');
const STATE_FILE = join(RUN_DIR, 'state.json');

export type TestRole = 'admin' | 'auctioneer' | 'bidderA' | 'bidderB';

export interface TestMember {
  id: string;
  email: string;
  name: string;
}

export interface RunState {
  runId: string;
  members: Record<TestRole, TestMember>;
}

export const newRunId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export const testEmail = (runId: string, label: string) => `${E2E_EMAIL_PREFIX}${runId}-${label}${E2E_EMAIL_DOMAIN}`;

export function saveState(state: RunState): void {
  mkdirSync(RUN_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export const loadState = (): RunState => JSON.parse(readFileSync(STATE_FILE, 'utf8')) as RunState;

export const storageStatePath = (who: TestRole) => join(RUN_DIR, `${who}.json`);
