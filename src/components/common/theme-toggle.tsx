'use client';
import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { useHydrated } from '@/hooks/use-client-state';

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const mounted = useHydrated();
  if (!mounted) return <Button variant="ghost" size="icon" aria-label="Toggle theme" />;
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  );
}
