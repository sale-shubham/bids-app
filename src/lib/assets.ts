// Build a public URL for a stored object key (S3/CloudFront). Images are uploaded
// presigned-direct-to-S3 and served via the CDN; the DB stores only the object key
// (e.g. `listings/<uuid>.png`), so the browser must prefix it with the CDN base.
//
// Base resolution (build-time inlined — must reference full env var names):
//   NEXT_PUBLIC_UPLOADS_BASE_URL (explicit), else the first NEXT_PUBLIC_IMAGE_ORIGINS entry.
const UPLOADS_BASE = (
  process.env.NEXT_PUBLIC_UPLOADS_BASE_URL ||
  (process.env.NEXT_PUBLIC_IMAGE_ORIGINS ?? '').split(',')[0] ||
  ''
)
  .trim()
  .replace(/\/$/, '');

export function assetUrl(key?: string | null): string {
  if (!key) return '';
  // Already an absolute URL (e.g. the presign response `url`) — pass through.
  if (/^https?:\/\//i.test(key)) return key;
  return `${UPLOADS_BASE}/${key.replace(/^\/+/, '')}`;
}
