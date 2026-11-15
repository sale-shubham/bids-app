import { afterEach, describe, expect, it, vi } from 'vitest';
import { fitWithin, resizeImage } from './resize-image';

const orig = new File([new Uint8Array(1000)], 'Photo.JPG', { type: 'image/jpeg' });

function stubCanvas(blob: Blob | null) {
  const ctx = { drawImage: vi.fn() };
  const canvas = { width: 0, height: 0, getContext: () => ctx, toBlob: (cb: (b: Blob | null) => void) => cb(blob) };
  const real = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => (tag === 'canvas' ? (canvas as unknown as HTMLCanvasElement) : real(tag)));
  return { canvas, ctx };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('fitWithin', () => {
  it('scales the longest side down, keeping the aspect ratio', () => {
    expect(fitWithin(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(3000, 6000, 2000)).toEqual({ width: 1000, height: 2000 });
  });
  it('never upscales', () => {
    expect(fitWithin(800, 600, 2000)).toEqual({ width: 800, height: 600 });
  });
});

describe('resizeImage', () => {
  it('returns the original when createImageBitmap is missing', async () => {
    vi.stubGlobal('createImageBitmap', undefined);
    expect(await resizeImage(orig)).toBe(orig);
  });

  it('returns the original when decoding throws', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('bad')));
    expect(await resizeImage(orig)).toBe(orig);
  });

  it('re-encodes to a smaller WebP, honouring EXIF orientation and the max side', async () => {
    const bitmap = vi.fn().mockResolvedValue({ width: 4000, height: 3000, close: vi.fn() });
    vi.stubGlobal('createImageBitmap', bitmap);
    const { canvas } = stubCanvas(new Blob([new Uint8Array(200)], { type: 'image/webp' }));
    const out = await resizeImage(orig, { maxSide: 2000, quality: 0.85 });
    expect(bitmap).toHaveBeenCalledWith(orig, { imageOrientation: 'from-image' });
    expect(canvas.width).toBe(2000);
    expect(canvas.height).toBe(1500);
    expect(out.type).toBe('image/webp');
    expect(out.name).toBe('Photo.webp');
  });

  it('returns the original when the result is larger', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 100, height: 100, close: vi.fn() }));
    stubCanvas(new Blob([new Uint8Array(5000)], { type: 'image/webp' }));
    expect(await resizeImage(orig)).toBe(orig);
  });

  it('returns the original when the browser cannot encode WebP (falls back to PNG)', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 100, height: 100, close: vi.fn() }));
    stubCanvas(new Blob([new Uint8Array(10)], { type: 'image/png' }));
    expect(await resizeImage(orig)).toBe(orig);
  });
});
