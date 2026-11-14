import Link from 'next/link';

// Public content-page chrome — reachable logged-out (signup links here before
// an account exists), so it can't use DashboardShell. Just the brand header
// the (auth) pages use on mobile, at every width.
export default function ContentPagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-background/80 px-6 backdrop-blur-sm">
        <Link href="/" className="text-2xl font-extrabold text-gradient">
          NobleBid
        </Link>
      </header>
      {children}
    </div>
  );
}
