'use client';
import * as React from 'react';

// Renders an uploaded image with a graceful fallback: tries the S3/CDN `src`
// first, and on load error swaps to `fallback` (a /public asset). Used for
// listing/product imagery so a missing or broken S3 object falls back to the
// static product image. Resets when `src` changes (different row/key).
export function AssetImage({
  src,
  fallback,
  alt = '',
  className,
}: {
  src?: string;
  fallback?: string;
  alt?: string;
  className?: string;
}) {
  const [errored, setErrored] = React.useState(false);
  // A new `src` gets a fresh attempt. Adjusted during render (React's pattern
  // for resetting state on a prop change) rather than in an effect.
  const [prevSrc, setPrevSrc] = React.useState(src);
  if (src !== prevSrc) {
    setPrevSrc(src);
    setErrored(false);
  }

  const finalSrc = !src || errored ? fallback : src;
  if (!finalSrc) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={finalSrc}
      alt={alt}
      className={className}
      onError={() => {
        if (fallback && finalSrc !== fallback) setErrored(true);
      }}
    />
  );
}
