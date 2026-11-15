'use client';
import { usePathname } from 'next/navigation';
import { useClientSnapshot } from '@/hooks/use-client-state';

/** `/login` or `/signup` with `?next=` set to the current page (path + query), so a guest returns here after signing in. */
export function useAuthHref(to: '/login' | '/signup'): string {
  const pathname = usePathname();
  // window.location.search rather than useSearchParams(): the latter forces a Suspense boundary around the whole shell.
  const search = useClientSnapshot(() => window.location.search, '');
  return `${to}?next=${encodeURIComponent(pathname + search)}`;
}
