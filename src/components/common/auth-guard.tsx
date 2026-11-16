"use client";
import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore, type Role } from "@/store/auth-store";
import { homeFor, normalizeRole } from "@/constants/routes";

// Client-side route guard. The edge gate (src/proxy.ts) already redirects on
// page loads; this keeps SPA navigation and a mid-session logout safe.
export function AuthGuard({
  allow,
  children,
}: {
  allow: Role[];
  children: React.ReactNode;
}) {
  const { member, initialized } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  // Legacy BIDDER / AUCTIONEER values (one release) count as MEMBER.
  const role = normalizeRole(member?.role);
  const allowed = !!role && allow.includes(role);

  React.useEffect(() => {
    if (!initialized) return;
    if (!member) {
      // Keep the page (path + query) so login can return to it.
      const here = pathname + window.location.search;
      router.replace(`/login?next=${encodeURIComponent(here)}`);
    } else if (!allowed) {
      router.replace(homeFor(member.role));
    }
  }, [initialized, member, allowed, router, pathname]);

  if (!initialized || !member || !allowed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <div className="app-loader" />
      </div>
    );
  }
  return <>{children}</>;
}
