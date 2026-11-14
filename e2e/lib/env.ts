import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Where the suite points, and the guard that keeps it off anything but a local stack.
//   E2E_BASE_URL      the app under test            (default http://localhost:3002)
//   E2E_API_URL       the API it talks to           (default http://localhost:4000)
//   E2E_DATABASE_URL  the API's dev database; default: DATABASE_URL read from ../bids-api/.env
//   E2E_IMAGE_URL     image URL stored on seeded auctions (default: <AWS_CLOUDFRONT_URL>/e2e/placeholder.jpg)
// Secrets are read by code and never printed.

export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3002';
export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000';
/** Local API runs EMAIL_DRIVER=stub: every email OTP is this code. */
export const STUB_OTP = process.env.E2E_STUB_OTP ?? '123456';
/** Password of every e2e member (bcrypt-hashed into the DB by lib/db.ts). */
export const PASSWORD = 'E2ePass123';

const here = dirname(fileURLToPath(import.meta.url));
const API_ENV_FILE = process.env.E2E_API_ENV_FILE ?? join(here, '..', '..', '..', 'bids-api', '.env');

/** Minimal dotenv reader: KEY=value, optional quotes, # comments. */
function readEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

const apiEnv = readEnvFile(API_ENV_FILE);
export const DATABASE_URL = process.env.E2E_DATABASE_URL ?? apiEnv.DATABASE_URL ?? '';

/** Auction images must live under the API's media base, so the default is built from it. */
export const IMAGE_URL =
  process.env.E2E_IMAGE_URL ?? `${(apiEnv.AWS_CLOUDFRONT_URL ?? 'https://cdn.example.com').replace(/\/+$/, '')}/e2e/placeholder.jpg`;

const LOCAL = [/^localhost$/, /^127\.0\.0\.1$/];

/** The suite creates and deletes data: refuse anything that is not a local app + API. */
export function assertLocalStack(): void {
  for (const [name, url] of [['E2E_BASE_URL', BASE_URL], ['E2E_API_URL', API_URL]] as const) {
    if (!LOCAL.some((re) => re.test(new URL(url).hostname))) throw new Error(`${name}=${url} is not a local host; refusing to run`);
  }
  if (!DATABASE_URL) throw new Error(`No database URL: set E2E_DATABASE_URL or DATABASE_URL in ${API_ENV_FILE}`);
}
