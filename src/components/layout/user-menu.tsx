'use client';
import * as React from 'react';
import Link from 'next/link';
import { LogOut, User } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { MemberAvatar } from '@/components/common/member-avatar';
import { useAuthStore } from '@/store/auth-store';
import { useLogout } from '@/features/auth/use-auth';
import { apiErrorMessage } from '@/lib/api-client';
import { useAuthHref } from '@/hooks/use-login-href';

// Header account control: avatar menu (Profile, Log out) when signed in,
// Log in / Sign up buttons (carrying `?next=` back to this page) for a guest. Shows a placeholder until the session check
// finishes so the buttons never flash for a logged-in visitor.
export function UserMenu() {
  const member = useAuthStore((s) => s.member);
  const initialized = useAuthStore((s) => s.initialized);
  const logout = useLogout();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const loginHref = useAuthHref('/login');
  const signupHref = useAuthHref('/signup');

  if (!initialized) return <Skeleton className="h-9 w-24 rounded-full" />;

  if (!member) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={loginHref}>Log in</Link>
        </Button>
        <Button asChild size="sm">
          <Link href={signupHref}>Sign up</Link>
        </Button>
      </div>
    );
  }

  const label = member.name || member.email;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Account menu for ${label}`}
            className="flex items-center gap-2 rounded-full p-0.5 pr-2 transition-colors hover:bg-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring sm:pr-3"
          >
            <MemberAvatar id={member.id} name={member.name} email={member.email} avatarUrl={member.avatarUrl} size="md" />
            <span className="hidden max-w-32 truncate text-sm font-medium sm:block">{label}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium">{label}</p>
            <p className="truncate text-xs text-muted-foreground">{member.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={member.role === 'SUPER_ADMIN' ? '/admin/profile' : '/profile'}>
              <User className="h-4 w-4" /> Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => setConfirmOpen(true)}
          >
            <LogOut className="h-4 w-4" /> Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Log out"
        description="Are you sure you want to log out of your account?"
        confirmLabel="Log out"
        variant="destructive"
        loading={logout.isPending}
        onConfirm={() => logout.mutate(undefined, { onError: (e) => toast.error(apiErrorMessage(e)) })}
      />
    </>
  );
}
