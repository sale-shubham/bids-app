'use client';
import * as React from 'react';
import { AssetImage } from '@/components/common/asset-image';
import { HoverGallery } from '@/components/common/hover-gallery';
import { ImageLightbox } from '@/components/common/image-lightbox';
import { cn } from '@/lib/utils';

// Detail-page gallery: big image (arrows via HoverGallery, click opens the
// lightbox) + a thumbnail strip. `index` is shared with the lightbox.
export function AuctionGallery({ images, title }: { images: string[]; title: string }) {
  const [index, setIndex] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const list = images.length ? images : [];

  if (!list.length) {
    return <div className="flex aspect-4/3 w-full items-center justify-center rounded-xl border bg-muted text-sm text-muted-foreground">No images</div>;
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open image viewer"
        className="relative block aspect-4/3 w-full cursor-zoom-in overflow-hidden rounded-xl border bg-muted"
      >
        <HoverGallery key={list[0]} images={list} alt={title} interval={3000} className="h-full w-full object-cover" />
      </button>
      {list.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {list.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => {
                setIndex(i);
                setOpen(true);
              }}
              aria-label={`View image ${i + 1}`}
              className={cn('h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-muted', i === index && 'ring-2 ring-primary')}
            >
              <AssetImage src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      <ImageLightbox images={list} alt={title} open={open} onOpenChange={setOpen} index={index} onIndexChange={setIndex} />
    </div>
  );
}
