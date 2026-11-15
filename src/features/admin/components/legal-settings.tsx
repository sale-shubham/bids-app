'use client';
import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { RichTextEditor } from '@/components/common/rich-text-editor';
import { apiErrorMessage } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import type { LegalPage, LegalSlug } from '../admin.types';
import { useLegalPage, useSaveLegal } from '../use-admin';

const PAGES: { slug: LegalSlug; label: string }[] = [
  { slug: 'terms-conditions', label: 'Terms & Conditions' },
  { slug: 'privacy-policy', label: 'Privacy Policy' },
  { slug: 'refund-policy', label: 'Refund Policy' },
  { slug: 'prohibited-items', label: 'Prohibited Items' },
];

function LegalEditor({ page }: { page: LegalPage }) {
  const save = useSaveLegal(page.slug);
  const [title, setTitle] = React.useState(page.title);
  const [content, setContent] = React.useState(page.content);
  const dirty = title !== page.title || content !== page.content;
  const titleError = title.trim().length < 2 ? 'Title is required' : '';
  // Quill reports an empty document as "<p><br></p>".
  const empty = content.replace(/<[^>]*>/g, '').trim() === '';

  const submit = () =>
    save.mutate(
      { title: title.trim(), content },
      {
        onSuccess: () => toast.success('Page saved'),
        onError: (e) => toast.error(apiErrorMessage(e, 'Could not save the page')),
      },
    );

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="space-y-1.5">
          <Label htmlFor="legal-title">Title</Label>
          <Input id="legal-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} aria-invalid={!!titleError} />
          {titleError && <p className="text-xs text-destructive">{titleError}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Content</Label>
          <RichTextEditor value={content} onChange={setContent} placeholder="Write the page content" />
        </div>
        <div className="flex flex-col gap-3 @lg/content:flex-row @lg/content:items-center @lg/content:justify-between">
          <p className="text-sm text-muted-foreground">
            {page.updatedAt ? `Last updated ${formatDate(page.updatedAt)}` : 'Not published yet'}
          </p>
          <Button onClick={submit} loading={save.isPending} disabled={!dirty || !!titleError || empty}>
            Save page
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function LegalSettings() {
  const [slug, setSlug] = React.useState<LegalSlug>('terms-conditions');
  const { data, isLoading, error, refetch } = useLegalPage(slug);

  return (
    <div className="space-y-4">
      <div className="w-full @lg/content:w-72">
        <Select value={slug} onValueChange={(v) => setSlug(v as LegalSlug)}>
          <SelectTrigger aria-label="Legal page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGES.map((p) => (
              <SelectItem key={p.slug} value={p.slug}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && !data ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{apiErrorMessage(error, 'Could not load this page')}</p>
            <Button variant="outline" onClick={() => void refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : isLoading || !data ? (
        <Skeleton className="h-96" />
      ) : (
        // key resets the editor state when switching page or after a save refreshes the cache
        <LegalEditor key={`${data.slug}:${data.updatedAt ?? ''}`} page={data} />
      )}
    </div>
  );
}
