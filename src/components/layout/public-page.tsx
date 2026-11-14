import { PublicHeader } from '@/components/layout/public-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { cn } from '@/lib/utils';

// Shell for public content pages: header, constrained main, footer.
export function PublicPage({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className={cn('mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6', className)}>{children}</main>
      <SiteFooter />
    </div>
  );
}
