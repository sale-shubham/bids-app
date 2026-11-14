import Link from 'next/link';

// Phase 0 placeholder — the real Home (live auctions, categories) arrives later.
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-gradient text-4xl font-extrabold tracking-tight">NobleBid</h1>
      <p className="text-muted-foreground">NobleBid — coming soon</p>
      <div className="flex gap-3">
        <Link href="/login" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Log in
        </Link>
        <Link href="/signup" className="rounded-lg border px-4 py-2 text-sm font-medium">
          Sign up
        </Link>
      </div>
    </main>
  );
}
