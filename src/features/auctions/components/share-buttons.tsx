'use client';
import * as React from 'react';
import { Link2, MessageCircle, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

// Copy link, WhatsApp, and the native share sheet when the browser has one.
// The share URL is read from window at click time, so there is no hydration
// difference; `canShare` is set after mount for the same reason.
export function ShareButtons({ title, path }: { title: string; path: string }) {
  const canShare = React.useSyncExternalStore(
    () => () => {},
    () => typeof navigator.share === 'function',
    () => false,
  );

  const url = () => new URL(path, window.location.origin).href;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url());
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy the link');
    }
  };

  const whatsapp = () => {
    const text = encodeURIComponent(`${title} ${url()}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title, url: url() });
    } catch {
      /* dismissed */
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={copy}>
        <Link2 className="h-4 w-4" /> Copy link
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={whatsapp}>
        <MessageCircle className="h-4 w-4" /> WhatsApp
      </Button>
      {canShare && (
        <Button type="button" variant="outline" size="sm" onClick={nativeShare}>
          <Share2 className="h-4 w-4" /> Share
        </Button>
      )}
    </div>
  );
}
