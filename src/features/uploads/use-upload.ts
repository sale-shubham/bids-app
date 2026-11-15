'use client';
import { useMutation } from '@tanstack/react-query';
import { presign, putToPresigned, type UploadFolder } from './uploads.api';
import { resizeImage } from './resize-image';

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
/** What the API accepts after the client resize. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** What a member may pick: photos are downscaled before upload, so the original can be larger. */
export const MAX_IMAGE_INPUT_BYTES = 25 * 1024 * 1024;

export const VIDEO_TYPES = ['video/mp4', 'video/webm'];
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/** Client check for a picked image file; null = fine. */
export function imageFileError(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return 'Use a JPG, PNG or WebP image.';
  if (file.size > MAX_IMAGE_INPUT_BYTES) return 'Image must be 25 MB or smaller.';
  return null;
}

/** Client check for a picked video file; null = fine. */
export function videoFileError(file: File): string | null {
  if (!VIDEO_TYPES.includes(file.type)) return 'Use an MP4 or WebM video.';
  if (file.size > MAX_VIDEO_BYTES) return 'Video must be 50 MB or smaller.';
  return null;
}

/** Validate, then downscale to a 2000 px WebP (when the browser can). Resolves with the file to upload. */
export async function prepareImage(file: File): Promise<File> {
  const bad = imageFileError(file);
  if (bad) throw new Error(bad);
  const out = await resizeImage(file, { maxSide: 2000, quality: 0.85 });
  if (out.size > MAX_IMAGE_BYTES) throw new Error('Image is still over 5 MB after resizing. Use a smaller image.');
  return out;
}

// resize -> presign -> PUT -> resolves with the file's public URL (store this on the record).
export function useUploadImage(folder: UploadFolder) {
  return useMutation({
    mutationFn: async (file: File) => {
      const prepared = await prepareImage(file);
      const { uploadUrl, url } = await presign({ folder, contentType: prepared.type, size: prepared.size });
      await putToPresigned(uploadUrl, prepared);
      return url;
    },
  });
}
