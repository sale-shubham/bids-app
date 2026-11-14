import DOMPurify from 'isomorphic-dompurify';
import { cn } from '@/lib/utils';

// Renders HTML authored by a SUPER_ADMIN in the admin rich-text editor
// (react-quill-new). The role is NOT a sufficient trust boundary: the API
// stores whatever is PUT to it verbatim (no server-side tag allowlist), and
// this HTML is served on the PUBLIC, unauthenticated /pages/[slug] route, so a
// stolen/malicious admin session could inject script that runs against every
// visitor. Sanitize on render with an allowlist matching the editor's toolbar
// (rich-text-editor.tsx FORMATS) — drops event handlers, script/style, and
// non-http(s)/mailto link schemes (e.g. javascript:).
// Typography/spacing for the injected tags lives in the `.rich-text` block in
// globals.css (no typography plugin in this project).
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'h2', 'h3', 'h4', 'p', 'br', 'strong', 'em', 'u',
    'ol', 'ul', 'li', 'a', 'blockquote', 'span',
  ],
  // `class` carries Quill's alignment/indent styling (ql-align-*, ql-indent-*).
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  // Only allow safe link schemes — blocks javascript:/data: hrefs.
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|#|\/)/i,
};

export function RichText({ html, className }: { html: string; className?: string }) {
  const clean = DOMPurify.sanitize(html, SANITIZE_CONFIG);
  return <div className={cn('rich-text', className)} dangerouslySetInnerHTML={{ __html: clean }} />;
}
