import { notFound } from 'next/navigation';
import { API_ORIGIN } from '@/constants/api';

// Server-side (RSC / generateMetadata) fetch helper. Browser code uses `api`
// (axios) instead — never import this from a client component.
//
// Envelope: `{ success, data }` (+ `meta` / `serverTime` on paginated lists).

export class ServerApiError extends Error {
  constructor(
    public status: number,
    public code?: string,
    message?: string,
  ) {
    super(message ?? `API ${status}`);
  }
}

interface Options {
  params?: Record<string, string | number | undefined>;
  /** Seconds for ISR-style revalidation. Omit for `cache: 'no-store'`. */
  revalidate?: number;
  /** Call Next's notFound() on a 404 (default true). */
  notFoundOn404?: boolean;
}

/** Returns the whole JSON body (`data`, `meta`, `serverTime` ...). */
export async function serverFetch(
  path: string,
  { params, revalidate, notFoundOn404 = true }: Options = {},
): Promise<unknown> {
  const url = new URL(`${API_ORIGIN}${path}`);
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, revalidate === undefined ? { cache: 'no-store' } : { next: { revalidate } });
  if (res.status === 404 && notFoundOn404) notFound();
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
    throw new ServerApiError(res.status, body?.error?.code, body?.error?.message);
  }
  return res.json();
}

/** Unwraps the envelope: returns `body.data`. */
export async function serverGet<T>(path: string, options?: Options): Promise<T> {
  const body = (await serverFetch(path, options)) as { data: T };
  return body.data;
}
