"use client";
import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore, type Role } from "@/store/auth-store";
import { homeFor } from "@/constants/routes";

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

  React.useEffect(() => {
    if (!initialized) return;
    if (!member) {
      // Keep the page (path + query) so login can return to it.
      const here = pathname + window.location.search;
      router.replace(`/login?next=${encodeURIComponent(here)}`);
    } else if (!allow.includes(member.role)) {
      router.replace(homeFor(member.role));
    }
  }, [initialized, member, allow, router, pathname]);

  if (!initialized || !member || !allow.includes(member.role)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <div className="app-loader" />
      </div>
    );
  }
  return <>{children}</>;
}
