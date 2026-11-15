'use client';
import * as React from 'react';
import { apiErrorMessage } from '@/lib/api-client';
import { presign, putToPresignedWithProgress } from './uploads.api';
import { videoFileError } from './use-upload';

export interface VideoUploadState {
  status: 'idle' | 'uploading' | 'error';
  progress: number;
  error: string | null;
  /** Local blob preview while the upload runs. */
  previewUrl: string | null;
}

// Pick -> validate -> presign (`auction-videos`) -> PUT with progress -> `onDone(url)`.
export function useVideoUpload(onDone: (url: string) => void) {
  const [state, setState] = React.useState<VideoUploadState>({ status: 'idle', progress: 0, error: null, previewUrl: null });
  const previewRef = React.useRef<string | null>(null);

  const revoke = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
  };
  React.useEffect(() => revoke, []);

  const upload = async (file: File) => {
    const bad = videoFileError(file);
    if (bad) {
      setState({ status: 'error', progress: 0, error: bad, previewUrl: null });
      return;
    }
    revoke();
    previewRef.current = URL.createObjectURL(file);
    setState({ status: 'uploading', progress: 0, error: null, previewUrl: previewRef.current });
    try {
      const { uploadUrl, url } = await presign({ folder: 'auction-videos', contentType: file.type, size: file.size });
      await putToPresignedWithProgress(uploadUrl, file, (progress) => setState((s) => ({ ...s, progress })));
      revoke();
      setState({ status: 'idle', progress: 100, error: null, previewUrl: null });
      onDone(url);
    } catch (err) {
      revoke();
      setState({ status: 'error', progress: 0, error: apiErrorMessage(err, 'Video upload failed'), previewUrl: null });
    }
  };

  const reset = () => {
    revoke();
    setState({ status: 'idle', progress: 0, error: null, previewUrl: null });
  };

  return { ...state, upload, reset };
}
