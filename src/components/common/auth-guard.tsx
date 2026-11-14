"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, type Role } from "@/store/auth-store";
import { homeFor } from "@/constants/routes";

type Allowed = Role;

// Client-side route guard. Server components also gate, but this keeps SPA nav safe.
export function AuthGuard({
  allow,
  children,
}: {
  allow: Allowed[];
  children: React.ReactNode;
}) {
  const { member, initialized } = useAuthStore();
  const router = useRouter();

  React.useEffect(() => {
    if (!initialized) return;
    if (!member) {
      router.replace("/login");
    } else if (!allow.includes(member.role)) {
      router.replace(homeFor(member.role));
    }
  }, [initialized, member, allow, router]);

  if (!initialized || !member || !allow.includes(member.role)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <div className="app-loader" />
      </div>
    );
  }
  return <>{children}</>;
}
