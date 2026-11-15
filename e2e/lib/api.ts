import { request, type APIRequestContext } from '@playwright/test';
import { API_URL, PASSWORD } from './env.ts';

// Thin client for the bids-api envelope `{ success, data | error }`. Used by setup
// (sign the seeded members in, save their cookies as storage state) and by specs
// that need a second actor without a second browser.

const url = (path: string) => `${API_URL.replace(/\/+$/, '')}${path}`;

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string | undefined,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(ctx: APIRequestContext, method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', path: string, data?: unknown): Promise<T> {
  const res = await ctx.fetch(url(path), { method, data });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; data?: T; error?: { code?: string; message?: string } };
  if (!res.ok() || body.success === false) {
    throw new ApiError(res.status(), body.error?.code, `${method} ${path} -> ${res.status()} ${body.error?.code ?? ''} ${body.error?.message ?? ''}`.trim());
  }
  return body.data as T;
}

export const api = {
  get: <T>(ctx: APIRequestContext, path: string) => call<T>(ctx, 'GET', path),
  post: <T>(ctx: APIRequestContext, path: string, data?: unknown) => call<T>(ctx, 'POST', path, data),
  patch: <T>(ctx: APIRequestContext, path: string, data?: unknown) => call<T>(ctx, 'PATCH', path, data),
  del: <T>(ctx: APIRequestContext, path: string) => call<T>(ctx, 'DELETE', path),
};

export const apiContext = (storageState?: string) => request.newContext({ storageState });

/** Logs `email` in through the API; the context keeps the auth cookies. */
export function login(ctx: APIRequestContext, email: string, password = PASSWORD) {
  return api.post<{ member: { id: string; role: string } }>(ctx, '/auth/login', { email, password });
}

export function placeBid(ctx: APIRequestContext, auctionId: string, maxAmountPaise: number) {
  return api.post(ctx, `/auctions/${auctionId}/bids`, { maxAmountPaise });
}

/** True when `target` answers with anything below 500. */
export async function ping(target: string): Promise<boolean> {
  const ctx = await request.newContext();
  try {
    const res = await ctx.get(target, { timeout: 8000, failOnStatusCode: false });
    return res.status() < 500;
  } catch {
    return false;
  } finally {
    await ctx.dispose();
  }
}
