import { api } from '@/lib/api-client';

/**
 * A PDF endpoint answers with bytes, not the JSON envelope, so an error body
 * arrives as a Blob too. Reading it back into JSON here is what lets
 * apiErrorCode() / apiErrorMessage() still find the code the API sent
 * (e.g. INVOICE_NOT_FOUND). Uses the shared `api` client, so the auth cookies
 * (withCredentials) and the 401 refresh flow apply.
 */
export const fetchPdfBlob = (url: string, params: object = {}) =>
  api
    .get(url, { params, responseType: 'blob' })
    .then((r) => r.data as Blob)
    .catch(async (err) => {
      const body = err?.response?.data;
      if (body instanceof Blob) {
        try {
          err.response.data = JSON.parse(await body.text());
        } catch {
          // Not JSON: leave it; apiErrorMessage() falls back to err.message.
        }
      }
      throw err;
    });

/**
 * Whether this browser shows a PDF by itself. Chrome on Android has no PDF
 * viewer: a tab sent to a PDF there stays blank, so on such a browser the file
 * is downloaded instead.
 */
export const canShowPdf = () => typeof navigator === 'undefined' || navigator.pdfViewerEnabled !== false;

/**
 * Opens the tab a PDF will be shown in. Call it inside the click handler,
 * before any await: a window.open() after one is a popup the browser blocks.
 * The tab says it is preparing while the PDF is fetched. Null where the
 * browser cannot show a PDF (canShowPdf) or blocked the tab; showPdf() then
 * downloads the file instead.
 */
export function openPdfTab(): Window | null {
  if (!canShowPdf()) return null;
  const tab = window.open('', '_blank');
  if (tab) {
    tab.document.title = 'Preparing PDF…';
    tab.document.body.textContent = 'Preparing PDF…';
  }
  return tab;
}

/** Shows a fetched PDF in the tab openPdfTab() opened. Without a tab the file downloads instead. */
export function showPdf(blob: Blob, tab: Window | null, filename: string) {
  const url = URL.createObjectURL(blob);
  if (tab) {
    tab.location.href = url;
  } else {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  }
  // The tab has its own reference by now; free ours after it has loaded.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
