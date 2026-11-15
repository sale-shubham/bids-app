'use client';
import * as React from 'react';
import { Loader2, Trash2, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MAX_VIDEO_BYTES, VIDEO_TYPES } from '@/features/uploads/use-upload';
import { useVideoUpload } from '@/features/uploads/use-video-upload';

const MAX_MB = MAX_VIDEO_BYTES / (1024 * 1024);

/**
 * Optional listing video: pick one MP4 / WebM (max 50 MB), upload it to the
 * `auction-videos` folder with progress, preview and remove.
 * Self-contained: `value` is the uploaded URL (or null), `onChange` gets the new URL / null.
 */
export function VideoUploadField({
  value,
  onChange,
  onUploadingChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  /** Called with true while an upload is running (the form disables submit). */
  onUploadingChange?: (busy: boolean) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const up = useVideoUpload((url) => onChange(url));
  const src = up.previewUrl ?? value;
  const busy = up.status === 'uploading';
  React.useEffect(() => {
    onUploadingChange?.(busy);
  }, [busy, onUploadingChange]);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void up.upload(file);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Video (optional)</p>
      <input ref={inputRef} type="file" accept={VIDEO_TYPES.join(',')} className="sr-only" aria-label="Choose video" onChange={onPick} />
      {src && <video src={src} controls preload="metadata" playsInline className="aspect-video w-full max-w-md rounded-lg border bg-black" />}
      {up.status === 'uploading' && (
        <div className="space-y-1" role="status">
          <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${up.progress}%` }} />
          </div>
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Uploading video… {up.progress}%
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={up.status === 'uploading'} onClick={() => inputRef.current?.click()}>
          <Video className="h-4 w-4" /> {value ? 'Replace video' : 'Add video'}
        </Button>
        {value && up.status !== 'uploading' && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            <Trash2 className="h-4 w-4" /> Remove video
          </Button>
        )}
      </div>
      {up.error ? (
        <p className="text-sm text-destructive" role="alert">
          {up.error}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">MP4 or WebM, up to {MAX_MB} MB.</p>
      )}
    </div>
  );
}
