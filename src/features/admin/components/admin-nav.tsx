'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/members', label: 'Members' },
  { href: '/admin/auctions', label: 'Auctions' },
  { href: '/admin/commissions', label: 'Commissions' },
  { href: '/admin/payments', label: 'Payments' },
  { href: '/admin/settings', label: 'Settings' },
];

/** Sub-navigation for the admin area (kept here so global nav files stay untouched). */
export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin sections" className="mb-6 overflow-x-auto">
      <ul className="flex w-max min-w-full gap-1 rounded-lg bg-muted p-1">
        {ITEMS.map((i) => {
          const active = i.href === '/admin' ? pathname === '/admin' : pathname.startsWith(i.href);
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  active ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
