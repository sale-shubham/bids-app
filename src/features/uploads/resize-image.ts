// Client-side image downscale + WebP re-encode, run before presigning so phone
// photos (often 8-15 MB) fit the 5 MB limit and load fast. Never throws: any
// missing browser support or a result that is not smaller returns the original.

export interface ResizeOptions {
  /** Longest side in px after resizing (never upscales). */
  maxSide?: number;
  /** WebP quality, 0-1. */
  quality?: number;
}

/** Target size keeping the aspect ratio so the longest side is at most `maxSide` (no upscaling). */
export function fitWithin(width: number, height: number, maxSide: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width, height };
  const scale = maxSide / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
}

export async function resizeImage(file: File, { maxSide = 2000, quality = 0.85 }: ResizeOptions = {}): Promise<File> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await toBlob(canvas, quality);
    // A browser that cannot encode WebP silently returns PNG: keep the original then.
    if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^./\\]+$/, '') || 'image';
    return new File([blob], `${name}.webp`, { type: 'image/webp' });
  } catch {
    return file;
  }
}
