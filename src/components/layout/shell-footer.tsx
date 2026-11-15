import Link from 'next/link';
import { PUBLIC_LEGAL_PAGES } from '@/constants/legal';
import { WEBSITE_LINKS } from '@/constants/website';

// Small links area at the foot of the public pages' content (inside the shell):
// website pages (separate origin, plain anchors) and the in-app legal pages.
export function ShellFooter() {
  const linkClass = 'text-muted-foreground hover:text-foreground hover:underline';
  return (
    <footer className="mt-12 space-y-2 border-t py-6 text-center text-xs text-muted-foreground">
      <nav aria-label="NobleBid" className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {WEBSITE_LINKS.map((l) => (
          <a key={l.href} href={l.href} className={linkClass}>
            {l.label}
          </a>
        ))}
      </nav>
      <nav aria-label="Legal" className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {PUBLIC_LEGAL_PAGES.map((p) => (
          <Link key={p.slug} href={`/pages/${p.slug}`} className={linkClass}>
            {p.name}
          </Link>
        ))}
      </nav>
      <p>&copy; NobleBid. All rights reserved.</p>
    </footer>
  );
}
