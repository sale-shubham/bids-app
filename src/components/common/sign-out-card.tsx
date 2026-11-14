'use client';
import * as React from 'react';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useLogout, useLogoutAll } from '@/features/auth/use-auth';
import { apiErrorMessage } from '@/lib/api-client';

// "Log out" (this device) and "Log out of all devices" (revokes every session).
export function SignOutCard() {
  const logout = useLogout();
  const logoutAll = useLogoutAll();
  const [open, setOpen] = React.useState<'one' | 'all' | null>(null);

  const onConfirm = () => {
    const mutation = open === 'all' ? logoutAll : logout;
    mutation.mutate(undefined, {
      onError: (e) => {
        toast.error(apiErrorMessage(e));
        setOpen(null);
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sign out</CardTitle>
        <CardDescription>End your session on this device, or on every device you are signed in on.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" onClick={() => setOpen('one')}>
          <LogOut className="h-4 w-4" /> Log out
        </Button>
        <Button
          variant="outline"
          className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={() => setOpen('all')}
        >
          <LogOut className="h-4 w-4" /> Log out of all devices
        </Button>
      </CardContent>

      <ConfirmDialog
        open={open !== null}
        onOpenChange={(o) => !o && setOpen(null)}
        title={open === 'all' ? 'Log out of all devices' : 'Log out'}
        description={
          open === 'all'
            ? 'Every device signed in to your account, including this one, will be logged out.'
            : 'Are you sure you want to log out of your account?'
        }
        confirmLabel={open === 'all' ? 'Log out everywhere' : 'Log out'}
        variant="destructive"
        loading={logout.isPending || logoutAll.isPending}
        onConfirm={onConfirm}
      />
    </Card>
  );
}
