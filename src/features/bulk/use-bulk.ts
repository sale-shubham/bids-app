'use client';
import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useUploadImage } from '@/features/uploads/use-upload';
import { createBulk } from './bulk.api';
import type { BulkItemPayload } from './bulk.types';

const CONCURRENCY = 3;

export function useBulkCreate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: BulkItemPayload[]) => createBulk(items),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['auctions'] }),
  });
}

export interface BulkUploadProgress {
  done: number;
  total: number;
}

/**
 * Upload the batch's images (resized, via the shared image upload hook) a few at a time.
 * Resolves with lower-cased file name -> URL; rejects with a message naming the first failing file.
 */
export function useBulkImageUpload() {
  const upload = useUploadImage('auctions');
  const mutateAsync = upload.mutateAsync;
  const [progress, setProgress] = React.useState<BulkUploadProgress | null>(null);

  const uploadAll = React.useCallback(
    async (files: File[]): Promise<Map<string, string>> => {
      const urls = new Map<string, string>();
      let done = 0;
      let next = 0;
      setProgress({ done: 0, total: files.length });
      const worker = async () => {
        while (next < files.length) {
          const file = files[next++];
          try {
            urls.set(file.name.toLowerCase(), await mutateAsync(file));
          } catch (e) {
            next = files.length; // stop the other workers
            throw new Error(`${file.name}: ${e instanceof Error ? e.message : 'upload failed'}`);
          }
          done += 1;
          setProgress({ done, total: files.length });
        }
      };
      try {
        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker));
      } finally {
        setProgress(null);
      }
      return urls;
    },
    [mutateAsync],
  );

  return { uploadAll, progress };
}
