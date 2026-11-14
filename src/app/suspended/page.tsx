'use client';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLogout } from '@/features/auth/use-auth';

// Landed here by api-client.ts's forceSuspended() when a request comes back
// with error.code === 'ACCOUNT_SUSPENDED' (a SUPER_ADMIN-paused member, or a
// member who's since been soft/hard-deleted). Registered as public in
// constants/routes.ts (PUBLIC_PREFIXES) so the edge gate/AuthBootstrap never
// bounce a still-cookied suspended member away from it.
//
// Own brand header (2026-09-12, was bare) — same minimal chrome
// `pages/layout.tsx` uses for public content pages, so this doesn't look
// like a broken/unstyled page next to the rest of the app. Also gained a
// real Sign Out button — `forceSuspended()` only clears the client-side
// store mirror, the backend never clears the nb_at/nb_rt cookies for
// ACCOUNT_SUSPENDED (unlike a dead refresh), so without this a suspended
// member had no way to actually end their session from here. `useLogout()`
// -> `POST /auth/logout`, unauthenticated route, works regardless of the
// account's suspended state.
export default function SuspendedPage() {
  const logout = useLogout();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-background/80 px-6 backdrop-blur-sm">
        <Link href="/" className="text-2xl font-extrabold text-gradient">
          NobleBid
        </Link>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 px-4 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <h1 className="text-2xl font-bold tracking-tight">Account suspended</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Your account has been suspended. Contact admin support for help getting this resolved.
        </p>
        <Button variant="outline" className="mt-2" loading={logout.isPending} onClick={() => logout.mutate()}>
          Sign Out
        </Button>
      </div>
    </div>
  );
}
