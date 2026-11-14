import Link from 'next/link';

const COLUMNS = [
  {
    title: 'NobleBid',
    links: [
      { href: '/about', label: 'About' },
      { href: '/how-it-works', label: 'How it works' },
      { href: '/leaderboard', label: 'Leaderboard' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/pages/terms-conditions', label: 'Terms & Conditions' },
      { href: '/pages/privacy-policy', label: 'Privacy Policy' },
      { href: '/pages/refund-policy', label: 'Refund Policy' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t bg-muted/30">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
        <div className="space-y-2">
          <p className="text-gradient text-xl font-extrabold">NobleBid</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            India&apos;s auction marketplace: bid in real time, win fairly, sell with confidence.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title} className="space-y-2">
            <p className="text-sm font-semibold">{col.title}</p>
            <ul className="space-y-1.5 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-muted-foreground hover:text-foreground hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t px-4 py-4 text-center text-xs text-muted-foreground">
        &copy; NobleBid. All rights reserved.
      </div>
    </footer>
  );
}
