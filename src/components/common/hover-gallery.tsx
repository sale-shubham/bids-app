'use client';
import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AssetImage } from '@/components/common/asset-image';
import { cn } from '@/lib/utils';

// Thumbnail that auto-cycles through its images while hovered (used on
// search/listing cards). Static single image when there's only one. Resets to
// the first frame on mouse leave. Purely presentational — the parent still owns
// click behaviour (e.g. opening a lightbox).
export function HoverGallery({
  images,
  fallback,
  alt = '',
  interval = 2000,
  className,
}: {
  images: string[];
  fallback?: string;
  alt?: string;
  interval?: number;
  className?: string;
}) {
  const count = images.length;
  const multiple = count > 1;
  const [index, setIndex] = React.useState(0);
  const [hovered, setHovered] = React.useState(false);

  // Manual nav (arrow buttons). Stops the click from bubbling to the parent
  // thumbnail (which opens the lightbox).
  const go = (delta: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIndex((i) => (i + delta + count) % count);
  };

  React.useEffect(() => {
    if (!hovered || !multiple) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), interval);
    return () => clearInterval(t);
  }, [hovered, multiple, count, interval]);

  return (
    <div
      className="group relative h-full w-full"
      onMouseEnter={() => setHovered(true)}
      // Snap back to the first frame once the pointer leaves.
      onMouseLeave={() => {
        setHovered(false);
        setIndex(0);
      }}
    >
      <AssetImage src={images[index] || undefined} fallback={fallback} alt={alt} className={className} />
      {multiple && (
        <>
          {/* Prev/next arrows — revealed on hover (desktop), always shown on touch
              (max-md) since there's no hover. Sit above the thumbnail's click. */}
          {/* role=button (not <button>) — the parent thumbnail is itself a
              <button> on the search card, and nested <button> is invalid HTML. */}
          <div
            role="button"
            aria-label="Previous image"
            onClick={go(-1)}
            className="absolute left-1 top-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-black/45 p-1 text-white opacity-0 backdrop-blur-xs transition hover:bg-black/70 group-hover:opacity-100 max-md:opacity-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </div>
          <div
            role="button"
            aria-label="Next image"
            onClick={go(1)}
            className="absolute right-1 top-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-black/45 p-1 text-white opacity-0 backdrop-blur-xs transition hover:bg-black/70 group-hover:opacity-100 max-md:opacity-100"
          >
            <ChevronRight className="h-4 w-4" />
          </div>
          <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/40 px-1.5 py-1 backdrop-blur-xs">
            {images.map((_, i) => (
              <span
                key={i}
                className={cn('h-1.5 rounded-full transition-all', i === index ? 'w-3 bg-white' : 'w-1.5 bg-white/60')}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
