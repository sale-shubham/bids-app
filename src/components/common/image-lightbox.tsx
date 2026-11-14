'use client';
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { AssetImage } from '@/components/common/asset-image';
import { cn } from '@/lib/utils';

// Fullscreen image viewer. Click a gallery image to open; when there is more
// than one image, prev/next controls (buttons + ←/→ keys) cycle through them.
// Controlled: parent owns `open` and the active `index` so the thumbnail strip
// and the lightbox stay in sync.
export function ImageLightbox({
  images,
  fallback,
  alt = '',
  open,
  onOpenChange,
  index,
  onIndexChange,
  autoPlay = false,
  interval = 3500,
}: {
  images: string[];
  fallback?: string;
  alt?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  index: number;
  onIndexChange: (index: number) => void;
  autoPlay?: boolean;
  interval?: number;
}) {
  const count = images.length;
  const multiple = count > 1;
  const [paused, setPaused] = React.useState(false);

  const go = React.useCallback(
    (delta: number) => onIndexChange((index + delta + count) % count),
    [index, count, onIndexChange],
  );

  React.useEffect(() => {
    if (!open || !multiple) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, multiple, go]);

  // Auto-advance slideshow. Depends on `index` so each tick re-arms after the
  // slide changes; pauses on hover/focus so the user can inspect an image.
  React.useEffect(() => {
    if (!open || !multiple || !autoPlay || paused) return;
    const t = setTimeout(() => go(1), interval);
    return () => clearTimeout(t);
  }, [open, multiple, autoPlay, paused, interval, index, go]);

  if (!count) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-label={alt || 'Image viewer'}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 focus:outline-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
        >
          <DialogPrimitive.Title className="sr-only">{alt || 'Image viewer'}</DialogPrimitive.Title>

          {/* Pause autoplay only while the pointer is over the image itself —
              hovering the backdrop keeps the slideshow running. */}
          <span onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} className="inline-flex">
            <AssetImage
              src={images[index]}
              fallback={fallback}
              alt={alt}
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            />
          </span>

          {multiple && (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={() => go(-1)}
                className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow-lg transition hover:bg-background focus:outline-hidden focus:ring-2 focus:ring-primary"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={() => go(1)}
                className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow-lg transition hover:bg-background focus:outline-hidden focus:ring-2 focus:ring-primary"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-background/80 px-3 py-2 shadow-lg">
                {images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Go to image ${i + 1}`}
                    aria-current={i === index}
                    onClick={() => onIndexChange(i)}
                    className={cn(
                      'h-2 rounded-full transition-all',
                      i === index ? 'w-5 bg-primary' : 'w-2 bg-muted-foreground/50 hover:bg-muted-foreground',
                    )}
                  />
                ))}
              </div>
            </>
          )}

          <DialogPrimitive.Close
            aria-label="Close"
            className={cn(
              'absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-background/80 text-foreground shadow-lg transition hover:bg-background focus:outline-hidden focus:ring-2 focus:ring-primary',
            )}
          >
            <X className="h-5 w-5" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
