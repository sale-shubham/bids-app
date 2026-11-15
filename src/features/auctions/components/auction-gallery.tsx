'use client';
import * as React from 'react';
import { AssetImage } from '@/components/common/asset-image';
import { HoverGallery } from '@/components/common/hover-gallery';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import { cn } from '@/lib/utils';

// Detail-page gallery: big image (arrows via HoverGallery, click opens the
// zoomable lightbox: pinch / scroll zoom, swipe, keyboard) + a thumbnail strip.
// `index` is shared with the lightbox. The listing video (if any) sits under the strip.
export function AuctionGallery({ images, title, videoUrl }: { images: string[]; title: string; videoUrl?: string | null }) {
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
      {videoUrl && (
        <video
          src={videoUrl}
          controls
          preload="metadata"
          playsInline
          aria-label={`${title} video`}
          className="aspect-video w-full rounded-xl border bg-black"
        />
      )}
      <Lightbox
        open={open}
        close={() => setOpen(false)}
        index={index}
        slides={list.map((src) => ({ src, alt: title }))}
        plugins={[Zoom]}
        zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
        on={{ view: ({ index: i }) => setIndex(i) }}
        carousel={{ finite: list.length <= 1 }}
        controller={{ closeOnBackdropClick: true }}
      />
    </div>
  );
}
