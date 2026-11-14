'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  Laptop,
  LogOut,
  Moon,
  RefreshCw,
  MonitorSmartphone,
  ShieldCheck,
  Smartphone,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { CountBadge } from '@/components/common/count-badge';
import { MyDevicesCard } from '@/components/common/my-devices-card';
import { apiErrorMessage } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  applyUpdateAndReload,
  isIos,
  isStandalone,
  promptInstall,
} from '@/lib/pwa';
import { useClientSnapshot, useHydrated, useInstallAvailable } from '@/hooks/use-client-state';
import { useLogout } from '@/features/auth/use-auth';
import { useAuthStore } from '@/store/auth-store';
import { usePushSubscription } from '@/features/push/use-push';
import { LEGAL_PAGES, legalPagePath } from '@/constants/legal';
import { getOverflowNavItems, isNavActive } from './mobile-bottom-nav';
import type { NavItem } from './dashboard-shell';

// The legal pages aren't nav items (they're not in memberNav/adminNav — no
// sidebar or bottom-bar slot for them, and they render outside DashboardShell
// on their own public chrome), so this page (/profile for members,
// /admin/profile for admins) is the only in-app entry point. Driven
// off LEGAL_PAGES so a page added to the catalogue shows up here for free.
const LEGAL_ICONS: Record<string, typeof FileText> = {
  'privacy-policy': ShieldCheck,
  'terms-conditions': FileText,
};

export interface ProfileTab {
  value: string;
  label: string;
  icon: LucideIcon;
  content: React.ReactNode;
}

// Full-page counterpart to the mobile bottom bar's 4th tab — the Profile page
// of both roles (/profile, /admin/profile), laid out like unikorncoatings_app's
// profile: one tab strip, one card per tab. Each role passes its own tabs
// (Account first); this appends the shared ones — Devices, only when the
// account's own device cap (`AuthMember.deviceLimit`, from GET /members/me) is
// above 1, then App (theme/install/legal/update/logout).
//
// On a phone, whatever the bottom bar didn't show (see getOverflowNavItems)
// opens the first tab as a tap grid — this page is where those items live.
//
// `?tab=<value>` picks the opening tab. A starting value only — switching
// tabs does not rewrite the URL. An unknown value (or `devices` for an
// account that has no Devices tab) opens the first tab.
export function MorePage(props: { nav: NavItem[]; title: string; description: string; tabs: ProfileTab[] }) {
  // useSearchParams() needs a Suspense boundary; nothing above it reads the
  // query, so the fallback is never seen.
  return (
    <React.Suspense fallback={null}>
      <ProfileTabs {...props} />
    </React.Suspense>
  );
}

function ProfileTabs({
  nav,
  title,
  description,
  tabs,
}: {
  nav: NavItem[];
  title: string;
  description: string;
  tabs: ProfileTab[];
}) {
  const pathname = usePathname();
  const overflow = getOverflowNavItems(nav);
  const deviceLimit = useAuthStore((s) => s.member?.deviceLimit ?? 1);

  const allTabs: ProfileTab[] = [
    ...tabs,
    ...(deviceLimit > 1
      ? [{ value: 'devices', label: 'Devices', icon: Laptop, content: <MyDevicesCard limit={deviceLimit} /> }]
      : []),
    // Not "Settings": a super admin also has the platform-wide Settings page
    // (/admin/settings) in the sidebar, and this tab is only about the app on
    // this device.
    { value: 'app', label: 'App', icon: MonitorSmartphone, content: <AppCard /> },
  ];

  // Derived, not reset in an effect: if the picked tab is not in the list
  // (bad `?tab=`, or Devices gone after the limit dropped) the first one shows.
  const requested = useSearchParams().get('tab');
  const [picked, setPicked] = React.useState(requested ?? '');
  const active = allTabs.some((t) => t.value === picked) ? picked : allTabs[0].value;

  // Stands in for the bottom bar, so it goes where the bar does — a phone
  // only; from md the sidebar lists every one of these items. Sits at the top
  // of the first tab, under the strip.
  const quickLinks = overflow.length > 0 && (
    <div className="mb-5 grid grid-cols-3 gap-3 md:hidden">
      {overflow.map((item) => {
        const current = isNavActive(pathname, item.href);
        return (
          <Link key={item.href} href={item.href}>
            <Card
              hover
              className={current ? 'border-primary/40 bg-primary/5' : undefined}
            >
              <CardContent className="relative flex aspect-square flex-col items-center justify-center gap-2 p-4 text-center">
                <CountBadge count={item.badge} className="absolute right-2 top-2" />
                <item.icon className={current ? 'h-6 w-6 text-primary' : 'h-6 w-6 text-muted-foreground'} />
                <span className="text-sm font-medium">{item.label}</span>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <Tabs value={active} onValueChange={setPicked}>
        {/* A phone gets an even, text-only strip so every tab (App holds
            Logout) fits on one row; from @lg the strip hugs its tabs at the
            left edge, icons back, like /admin/settings. */}
        <TabsList className="w-full @lg/content:w-fit">
          {allTabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="flex-1 gap-1.5 px-2 @lg/content:flex-none @lg/content:px-3">
              <t.icon className="hidden h-4 w-4 @lg/content:block" /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {/* Radix unmounts an inactive tab's content, so an open dialog does
            not survive a switch. */}
        {allTabs.map((t, i) => (
          <TabsContent key={t.value} value={t.value}>
            {i === 0 && quickLinks}
            {t.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// One settings row: icon, title and state on the left, its action on the
// right — stacked under it on a phone, where the action goes full width.
// `inline` keeps a compact control (a switch) on the right at every width:
// stacked, it sat alone under the text at the left edge, cut off from its row.
function SettingRow({
  icon: Icon,
  title,
  description,
  inline = false,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  inline?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex gap-3 p-4',
        inline ? 'items-center' : 'flex-col @lg/content:flex-row @lg/content:items-center',
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </span>
        <div className="min-w-0">
          <div className="font-medium">{title}</div>
          <div className="text-sm text-muted-foreground">{description}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

const ACTION = 'w-full shrink-0 @lg/content:w-auto';

// This device's new-message notifications (readme/flows/push-notifications.md):
// the push + app-icon badge switch. Members only — admins don't DM. The same
// usePushSubscription() query as the /chat permission toast, so turning it on
// in either place flips the other. Always shown, disabled with the reason when
// it can't do anything, rather than hidden: a settings tab with nothing where
// notifications should be is the same dead end as a switch that does nothing.
function NotificationsRow() {
  const push = usePushSubscription();
  const unavailable = push.state === 'unsupported' || push.state === 'blocked' || !push.configured;
  const description =
    push.blockedReason ??
    (push.state === 'unsupported'
      ? 'Not supported by this browser.'
      : !push.configured
        ? 'Not set up on this server yet.'
        : push.state === 'on'
          ? 'On — outbid and auction alerts show on this device, with a count on the app icon, even when NobleBid is closed.'
          : 'Off — turn on to be told about outbid and auction alerts when NobleBid is closed.');

  return (
    <SettingRow icon={Bell} title="Message notifications" description={description} inline>
      <Switch
        aria-label="Message notifications on this device"
        checked={push.state === 'on'}
        disabled={unavailable || push.busy}
        onCheckedChange={(on) => void (on ? push.enable() : push.disable())}
      />
    </SettingRow>
  );
}

// The App tab: this device's theme, install, legal pages, cache reset
// and logout, as rows of one list.
function AppCard() {
  const { resolvedTheme, setTheme } = useTheme();
  const mountedTheme = useHydrated();
  const dark = resolvedTheme === 'dark';

  const installAvailable = useInstallAvailable();
  const [installing, setInstalling] = React.useState(false);
  const [showIosInstructions, setShowIosInstructions] = React.useState(false);
  const standalone = useClientSnapshot(isStandalone, false);
  const isMember = useAuthStore((s) => !!s.member);

  const handleInstall = async () => {
    if (isIos() && !standalone) {
      setShowIosInstructions(true);
      return;
    }
    setInstalling(true);
    try {
      const accepted = await promptInstall();
      if (accepted) toast.success('App installed');
    } finally {
      setInstalling(false);
    }
  };

  const qc = useQueryClient();
  const [refreshing, setRefreshing] = React.useState(false);
  const handleClearCacheAndUpdate = async () => {
    setRefreshing(true);
    try {
      qc.clear();
      await applyUpdateAndReload();
    } catch {
      toast.error('Update failed. Please try again.');
      setRefreshing(false);
    }
  };

  const logout = useLogout();
  const [logoutOpen, setLogoutOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">App settings</CardTitle>
        <CardDescription>Theme, install, legal pages and logout for this device.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y overflow-hidden rounded-lg border">
          <SettingRow icon={dark ? Moon : Sun} title="Theme" description={dark ? 'Dark mode' : 'Light mode'}>
            <Button
              variant="outline"
              size="sm"
              className={ACTION}
              disabled={!mountedTheme}
              onClick={() => setTheme(dark ? 'light' : 'dark')}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {dark ? 'Use light mode' : 'Use dark mode'}
            </Button>
          </SettingRow>

          <SettingRow
            icon={Smartphone}
            title="Install App"
            description={
              standalone
                ? 'Installed and running in standalone mode'
                : installAvailable || isIos()
                  ? 'Add to your home screen for a faster, app-like experience'
                  : 'Installation not supported on this browser'
            }
          >
            <Button
              size="sm"
              variant={standalone ? 'secondary' : 'default'}
              className={ACTION}
              disabled={standalone || (!installAvailable && !isIos()) || installing}
              onClick={handleInstall}
            >
              {standalone ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Installed
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" /> {installing ? 'Installing…' : 'Install App'}
                </>
              )}
            </Button>
          </SettingRow>

          {isMember && <NotificationsRow />}

          {LEGAL_PAGES.map((page) => {
            const Icon = LEGAL_ICONS[page.slug] ?? FileText;
            return (
              <Link
                key={page.slug}
                href={legalPagePath(page.slug)}
                className="flex items-center gap-3 p-4 transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </span>
                <span className="min-w-0 flex-1 font-medium">{page.name}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            );
          })}

          <SettingRow
            icon={RefreshCw}
            title="App version"
            description="Clears cached data and reloads the latest version."
          >
            <Button variant="outline" size="sm" className={ACTION} onClick={handleClearCacheAndUpdate} disabled={refreshing}>
              <RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              {refreshing ? 'Updating…' : 'Clear Cache & Update'}
            </Button>
          </SettingRow>

          <SettingRow icon={LogOut} title="Log out" description="Sign out of NobleBid on this device.">
            <Button
              variant="outline"
              size="sm"
              className={cn(ACTION, 'border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground')}
              onClick={() => setLogoutOpen(true)}
            >
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </SettingRow>
        </div>
      </CardContent>

      <Dialog open={showIosInstructions} onOpenChange={setShowIosInstructions}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Install NobleBid</DialogTitle>
            <DialogDescription>Add NobleBid to your home screen from Safari.</DialogDescription>
          </DialogHeader>
          <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
            <li>Tap the Share button at the bottom of Safari.</li>
            <li>Scroll down and tap &ldquo;Add to Home Screen&rdquo;.</li>
            <li>Tap &ldquo;Add&rdquo; to finish.</li>
          </ol>
          <Button className="w-full" onClick={() => setShowIosInstructions(false)}>
            Got it
          </Button>
        </DialogContent>
      </Dialog>

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
    </Card>
  );
}
