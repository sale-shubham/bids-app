# GST invoices

Code: `src/features/invoices/` (`invoices.api/types/schema.ts`, `use-invoices.ts`, `components/invoices-card.tsx`), `src/lib/gst.ts` (state codes, GSTIN regex), `src/components/common/billing-details-card.tsx`, admin `src/app/(admin)/admin/invoices/page.tsx` and `src/features/admin/components/invoice-settings.tsx`.

## Member side
- Billing details (Account tab, non-admin): optional `gstin` and `billingState` (select of Indian states/UTs with GST codes, `GST_STATES`), saved with `PATCH /members/me`. Schema `billingSchema` (`members.schema.ts`): GSTIN `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$` (upper-cased), first 2 digits must equal the state code when both are set; an emptied field is sent as `null`. `INVALID_GSTIN` maps in `members.errors.ts`.
- Invoices tab (`/profile?tab=invoices`, the "invoice-issued" email links here): `GET /invoices/mine` (infinite scroll, 20/page) listing number, type (Commission / Promotion / Forfeited deposit), total, "Tax invoice" or "Receipt" badge, date and a Download button. Download = `GET /invoices/:id/pdf`, which streams `application/pdf` (the API renders it per request, no URL). `useDownloadInvoice` calls `openPdfTab()` inside the click handler (before any await, so no popup block), fetches the bytes with `fetchPdfBlob` and shows them with `showPdf()` from `src/lib/pdf.ts`; the blob URL is revoked after 60 s. Browsers without a PDF viewer (`navigator.pdfViewerEnabled === false`) download the file instead, named from the invoice number with non A-Za-z0-9- characters as `-` (`invoicePdfFilename`). The button shows "Preparing…" while it loads. A JSON error body (e.g. 404 `INVOICE_NOT_FOUND`) is parsed back out of the Blob so `invoiceErrorMessage` still maps it, and the pre-opened tab is closed.

## Admin side
- `/admin/invoices` (nav "Invoices"): `GET /admin/invoices?type=&q=&page&pageSize` through `useAdminList` (table / cards), type select + search, Download per row (same PDF endpoint and hook; SUPER_ADMIN may read any invoice).
- Settings > "Invoice details" tab: `GET/PUT /admin/settings/invoice` `{ legalName, gstin, address, stateCode, gstRateBps, commissionInclusive, sacCode }`. Form shows GST rate as % (bps on the wire), a switch for commission-inclusive, SAC code 4-8 digits; GSTIN optional but must match the state code.

Notification type `invoice-issued` renders through the generic notification list.
