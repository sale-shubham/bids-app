import axios from 'axios';
import { api } from '@/lib/api-client';

export type UploadFolder = 'auctions' | 'avatars' | 'auction-videos';

export interface Presigned {
  uploadUrl: string;
  key: string;
  url: string;
}

export async function presign(input: {
  folder: UploadFolder;
  contentType: string;
  size: number;
}): Promise<Presigned> {
  try {
    const res = await api.post('/uploads/presign', input);
    return res.data.data;
  } catch (err) {
    // 503: object storage isn't configured (typical on a local API).
    if (axios.isAxiosError(err) && err.response?.status === 503) {
      throw new Error('Image uploads are not available right now. Please try again later.');
    }
    throw err;
  }
}

// PUT the raw bytes to the presigned URL. Uses fetch (not the `api` axios
// instance) so no credentials/auth headers are attached — extra headers break
// an S3 signature. Content-Type MUST equal the `contentType` it was signed with.
export async function putToPresigned(uploadUrl: string, file: File) {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status}). Please try again.`);
}

// Same PUT as above, via XHR so the caller can show upload progress (fetch has
// no upload progress events). Content-Length is set by the browser from the
// File, matching the size that was presigned.
export function putToPresignedWithProgress(uploadUrl: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status}). Please try again.`));
    xhr.onerror = () => reject(new Error('Upload failed. Check your connection and try again.'));
    xhr.send(file);
  });
}
