"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { CountBadge } from "@/components/common/count-badge";
import { MobileBottomNav, isNavActive, type MoreTab } from "@/components/layout/mobile-bottom-nav";
import { BlockNativePinch, PinchZoom } from "@/components/layout/pinch-zoom";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { PageTransition } from "@/components/common/motion";
import { useAuthStore } from "@/store/auth-store";
import { useLogout } from "@/features/auth/use-auth";
import { homeFor } from "@/constants/routes";
import { useClientSnapshot } from "@/hooks/use-client-state";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Desktop sidebar only: a heading ("Buying", "Selling") shown above the first item of each run of items sharing it. */
  group?: string;
  /** Pin to the mobile bottom bar regardless of array position (see mobile-bottom-nav.tsx). */
  pinMobile?: boolean;
  /** Hide entirely on mobile (bottom bar + More page) — desktop sidebar still shows it. */
  hideMobile?: boolean;
  /** Desktop sidebar only: render in its own group directly above Logout instead of the primary scrollable list. Mobile bottom bar/More page is unaffected — still positional/pinMobile-driven. */
  pinBottomDesktop?: boolean;
  /** Live count shown beside the item (`<CountBadge>`) — attached at runtime, not declared in a nav array: attached by the nav hook (e.g. unread counts). On a phone an overflow item's count shows on its Profile-grid cell, and the 4th tab carries a dot. */
  badge?: number;
}

/** Sidebar rows with a small heading above each new `group` run (ungrouped items get none). */
function renderNavList(items: NavItem[], pathname: string) {
  let prev: string | undefined;
  return items.map((item) => {
    const heading = item.group && item.group !== prev ? item.group : null;
    prev = item.group;
    return (
      <React.Fragment key={item.href}>
        {heading && (
          <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
            {heading}
          </p>
        )}
        {renderNavLink(item, pathname)}
      </React.Fragment>
    );
  });
}

function renderNavLink(item: NavItem, pathname: string) {
  const active = isNavActive(pathname, item.href);
  return (
    <Link
      key={item.href}
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {active && (
        <span className="absolute left-0 h-5 w-1 -translate-x-3 rounded-r-full bg-primary" />
      )}
      <item.icon className="h-4 w-4" />
      {item.label}
      <CountBadge count={item.badge} className="ml-auto" />
    </Link>
  );
}

export function DashboardShell({
  nav,
  moreTab,
  guest = false,
  children,
}: {
  nav: NavItem[];
  moreTab: MoreTab;
  /** Logged-out visitor on a public page: no Logout / theme-in-profile, brand goes to /auctions. */
  guest?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const member = useAuthStore((s) => s.member);
  const logout = useLogout();
  // Desktop sidebar state: the stored value once hydrated (false during SSR, so
  // no hydration mismatch), overridden by this session's toggles.
  const storedCollapsed = useClientSnapshot(() => localStorage.getItem("sidebar-collapsed") === "1", false);
  const [toggledCollapsed, setToggledCollapsed] = React.useState<boolean | null>(null);
  const collapsed = toggledCollapsed ?? storedCollapsed;
  const toggleCollapsed = () => {
    const next = !collapsed;
    setToggledCollapsed(next);
    localStorage.setItem("sidebar-collapsed", next ? "1" : "0");
  };
  const [animate, setAnimate] = React.useState(false);
  const mainRef = React.useRef<HTMLElement>(null);
  const [logoutOpen, setLogoutOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  // Enable the width transition only on the next frame so the restored state
  // appears instantly and only later user toggles animate.
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout.mutateAsync();
      setLogoutOpen(false);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setIsLoggingOut(false);
    }
  };

  const brandHref = member ? homeFor(member.role) : "/auctions";
  const primaryNav = nav.filter((item) => !item.pinBottomDesktop);
  const bottomNav = nav.filter((item) => item.pinBottomDesktop);

  const SidebarBody = (
    <>
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Link href={brandHref} className="text-2xl font-extrabold text-gradient">
          NobleBid
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {renderNavList(primaryNav, pathname)}
      </nav>
      {!guest && (
        <div className="space-y-1 border-t p-3">
          {bottomNav.map((item) => renderNavLink(item, pathname))}
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground"
            onClick={() => setLogoutOpen(true)}
          >
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      )}
    </>
  );

  return (
    // md:h-dvh, not just h-screen: on iPad the 100vh of h-screen is the
    // toolbars-collapsed height, and since only <main> scrolls the toolbars
    // never collapse, so the sidebar footer (Logout) sat under the browser
    // chrome. Kept to md+ where the sidebar exists; phones are unchanged.
    <div className="flex h-screen overflow-hidden bg-muted/30 md:h-dvh">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden h-screen shrink-0 overflow-hidden bg-card md:block md:h-dvh",
          animate && "transition-[width] duration-300 ease-in-out",
          collapsed ? "md:w-0 md:border-r-0" : "md:w-64 md:border-r",
        )}
      >
        <div className="flex h-full w-64 flex-col">{SidebarBody}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Solid background, no backdrop-blur-sm: <main> below is the scroll
            container, so nothing ever passes under this header and the blur
            did nothing — except on iOS WebKit, where a backdrop-filter layer
            re-rasterises its children and left the logo visibly soft. */}
        <header className="z-30 flex h-[72px] shrink-0 items-center justify-between border-b bg-background px-4 pt-2 sm:px-6 md:h-16 md:pt-0">
          <div className="flex items-center gap-2">
            <Link
              href={brandHref}
              className="text-xl font-extrabold text-gradient md:hidden"
            >
              NobleBid
            </Link>
            <button
              className="hidden md:inline-flex"
              aria-label={collapsed ? "Show sidebar" : "Hide sidebar"}
              onClick={toggleCollapsed}
            >
              <Menu className="h-5 w-5" />
            </button>
            {member?.role === "SUPER_ADMIN" && (
              <span className="text-sm font-medium text-muted-foreground">
                Super Admin
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* A signed-in member's theme switch lives on Profile > App on a phone; a guest has no Profile. */}
            <div className={guest ? undefined : "hidden md:block"}>
              <ThemeToggle />
            </div>
            <NotificationBell />
            <UserMenu />
          </div>
        </header>
        {/* Bottom padding clears the 80px mobile bottom nav (pb-24); desktop needs less. */}
        {/* The ONLY zoomable surface. Native page pinch-zoom is off, and
            <PinchZoom> zooms what is inside <main> — so the bottom nav,
            a sibling outside it, never zoom and never stutter.
            touch-pan-x/y lets one finger scroll natively while leaving pinch
            to us. */}
        {/* @container/content: the surface every page body lays out against
            (docs/CONTAINER_QUERIES.md). The sidebar is 0 or 256px on the
            member's own toggle, so the window width can't tell a page how much
            room it has — this box can. The padding classes stay viewport-based
            (they clear chrome), and a query measures the content box, so they
            are already subtracted from what pages see. */}
        <main
          ref={mainRef}
          className="@container/content flex-1 touch-pan-x touch-pan-y overflow-y-auto px-4 pb-24 pt-4 sm:px-6 sm:pt-6 md:px-6 md:pb-8 md:pt-6"
        >
          <PinchZoom scrollRef={mainRef}>
            {/* key by route → re-runs the enter animation on every navigation */}
            <PageTransition key={pathname}>{children}</PageTransition>
          </PinchZoom>
        </main>
      </div>

      <BlockNativePinch />
      <MobileBottomNav nav={nav} moreTab={moreTab} />

      <ConfirmDialog
        open={logoutOpen}
        onOpenChange={(open) => !open && setLogoutOpen(false)}
        title="Log Out"
        description="Are you sure you want to log out of your account?"
        confirmLabel="Log Out"
        onConfirm={confirmLogout}
        loading={isLoggingOut}
        variant="destructive"
      />
    </div>
  );
}
