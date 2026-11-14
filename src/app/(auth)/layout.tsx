import Link from 'next/link';

// /login and /signup must never be served from a cache: as static pages Next
// marks them `s-maxage=31536000`, so the CDN could answer without invoking
// src/proxy.ts and a signed-in visitor would never be redirected home.
// Dynamic rendering makes Next send `private, no-cache, no-store` instead.
export const dynamic = 'force-dynamic';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 shrink-0 items-center border-b bg-background px-6">
        <Link href="/" className="text-2xl font-extrabold text-gradient">
          NobleBid
        </Link>
      </header>
      <div className="flex flex-1 justify-center p-6 sm:p-12">
        <div className="my-auto w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
