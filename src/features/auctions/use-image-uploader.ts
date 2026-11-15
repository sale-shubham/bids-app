'use client';
import * as React from 'react';
import { toast } from 'sonner';
import { presign, putToPresignedWithProgress } from '@/features/uploads/uploads.api';
import { imageFileError, prepareImage } from '@/features/uploads/use-upload';
import { apiErrorMessage } from '@/lib/api-client';

export interface ImageItem {
  id: string;
  /** CDN URL once uploaded (or the existing URL when editing). */
  url?: string;
  /** Local blob preview while/after uploading a new file. */
  previewUrl?: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

const uid = () => Math.random().toString(36).slice(2);

/**
 * Multi-image uploader: select -> presign -> PUT with per-file progress.
 * `onChange(urls, uploading)` is called after every change with the uploaded
 * URLs in display order (first = cover) so the form can mirror them.
 * Items live in a ref (source of truth for async progress updates) mirrored into state for render.
 */
export function useImageUploader({
  initialUrls = [],
  max = 8,
  onChange,
}: {
  initialUrls?: string[];
  max?: number;
  onChange: (urls: string[], uploading: boolean) => void;
}) {
  const initial = React.useMemo<ImageItem[]>(
    () => initialUrls.map((url) => ({ id: uid(), url, progress: 100, status: 'done' as const })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seeded once
    [],
  );
  const itemsRef = React.useRef<ImageItem[]>(initial);
  const [items, setItems] = React.useState<ImageItem[]>(initial);
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  });

  const commit = React.useCallback((next: ImageItem[]) => {
    itemsRef.current = next;
    setItems(next);
    onChangeRef.current(
      next.filter((i) => i.status === 'done' && i.url).map((i) => i.url as string),
      next.some((i) => i.status === 'uploading'),
    );
  }, []);

  const patch = React.useCallback(
    (id: string, p: Partial<ImageItem>) => commit(itemsRef.current.map((i) => (i.id === id ? { ...i, ...p } : i))),
    [commit],
  );

  const uploadOne = React.useCallback(
    async (item: ImageItem, file: File) => {
      try {
        const prepared = await prepareImage(file); // downscaled to a 2000 px WebP when the browser can
        const { uploadUrl, url } = await presign({ folder: 'auctions', contentType: prepared.type, size: prepared.size });
        await putToPresignedWithProgress(uploadUrl, prepared, (pct) => {
          // Progress ticks don't change the URL list; update render state only.
          itemsRef.current = itemsRef.current.map((i) => (i.id === item.id ? { ...i, progress: pct } : i));
          setItems(itemsRef.current);
        });
        patch(item.id, { status: 'done', url, progress: 100 });
      } catch (err) {
        patch(item.id, { status: 'error', error: apiErrorMessage(err, 'Upload failed') });
      }
    },
    [patch],
  );

  const addFiles = (files: FileList | File[]) => {
    const list = Array.from(files);
    const room = max - itemsRef.current.length;
    if (room <= 0) {
      toast.error(`You can add up to ${max} images.`);
      return;
    }
    if (list.length > room) toast.info(`Only ${room} more image${room === 1 ? '' : 's'} fit — extra files were skipped.`);
    const accepted: { item: ImageItem; file: File }[] = [];
    for (const file of list.slice(0, room)) {
      const bad = imageFileError(file);
      if (bad) {
        toast.error(`${file.name}: ${bad}`);
        continue;
      }
      accepted.push({ item: { id: uid(), previewUrl: URL.createObjectURL(file), progress: 0, status: 'uploading' }, file });
    }
    if (!accepted.length) return;
    commit([...itemsRef.current, ...accepted.map((a) => a.item)]);
    accepted.forEach((a) => void uploadOne(a.item, a.file));
  };

  const revoke = (i?: ImageItem) => {
    if (i?.previewUrl) URL.revokeObjectURL(i.previewUrl);
  };

  const remove = (id: string) => {
    revoke(itemsRef.current.find((i) => i.id === id));
    commit(itemsRef.current.filter((i) => i.id !== id));
  };

  const move = (id: string, delta: -1 | 1) => {
    const arr = [...itemsRef.current];
    const from = arr.findIndex((i) => i.id === id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= arr.length) return;
    [arr[from], arr[to]] = [arr[to], arr[from]];
    commit(arr);
  };

  React.useEffect(
    () => () => {
      itemsRef.current.forEach(revoke);
    },
    [],
  );

  return { items, addFiles, remove, move, uploading: items.some((i) => i.status === 'uploading') };
}
