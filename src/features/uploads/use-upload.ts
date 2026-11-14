'use client';
import { useMutation } from '@tanstack/react-query';
import { presign, putToPresigned, type UploadFolder } from './uploads.api';

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// presign -> PUT -> resolves with the file's public URL (store this on the record).
export function useUploadImage(folder: UploadFolder) {
  return useMutation({
    mutationFn: async (file: File) => {
      if (!IMAGE_TYPES.includes(file.type)) throw new Error('Use a JPG, PNG or WebP image.');
      if (file.size > MAX_IMAGE_BYTES) throw new Error('Image must be 5 MB or smaller.');
      const { uploadUrl, url } = await presign({ folder, contentType: file.type, size: file.size });
      await putToPresigned(uploadUrl, file);
      return url;
    },
  });
}
