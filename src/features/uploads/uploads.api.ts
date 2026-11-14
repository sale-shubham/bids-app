import axios from 'axios';
import { api } from '@/lib/api-client';

export type UploadFolder = 'auctions' | 'avatars';

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
