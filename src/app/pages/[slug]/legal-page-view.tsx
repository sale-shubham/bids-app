'use client';
import { RichText } from '@/components/common/rich-text';
import { Skeleton } from '@/components/ui/skeleton';
import { useLegalPage } from '@/features/legal/use-legal';
import { legalPageName } from '@/constants/legal';

// Fetches through the shared api client (hard rule: never raw fetch), so the
// copy is always whatever the admin last saved — no rebuild needed to publish.
export function LegalPageView({ slug }: { slug: string }) {
  const { data, isLoading, isError } = useLegalPage(slug);
  const title = data?.name ?? legalPageName(slug);

  return (
    <main className="container max-w-3xl py-10 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      {data?.updatedAt && (
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated{' '}
          {new Date(data.updatedAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      )}

      <div className="mt-8">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className={i % 4 === 3 ? 'h-4 w-2/3' : 'h-4 w-full'} />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-muted-foreground">
            Could not load this page right now. Please try again later.
          </p>
        ) : data?.content ? (
          <RichText html={data.content} />
        ) : (
          <p className="text-sm text-muted-foreground">This page has not been published yet.</p>
        )}
      </div>
    </main>
  );
}
