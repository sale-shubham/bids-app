import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api-client', () => ({ api: { get } }));

import { canShowPdf, fetchPdfBlob, openPdfTab, showPdf } from './pdf';

const setViewer = (v: boolean | undefined) => Object.defineProperty(navigator, 'pdfViewerEnabled', { value: v, configurable: true });

afterEach(() => {
  vi.useRealTimers();
  setViewer(undefined);
});

describe('fetchPdfBlob', () => {
  it('asks for a blob and returns it', async () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });
    get.mockResolvedValue({ data: blob });
    await expect(fetchPdfBlob('/x/pdf')).resolves.toBe(blob);
    expect(get).toHaveBeenCalledWith('/x/pdf', { params: {}, responseType: 'blob' });
  });

  it('parses a JSON error Blob back into the response body', async () => {
    const err: { response: { data: unknown } } = {
      response: { data: new Blob([JSON.stringify({ success: false, error: { code: 'INVOICE_NOT_FOUND' } })], { type: 'application/json' }) },
    };
    get.mockRejectedValue(err);
    await expect(fetchPdfBlob('/x/pdf')).rejects.toBe(err);
    expect(err.response.data).toEqual({ success: false, error: { code: 'INVOICE_NOT_FOUND' } });
  });

  it('leaves a non-JSON error Blob alone', async () => {
    const body = new Blob(['<html>'], { type: 'text/html' });
    const err = { response: { data: body } };
    get.mockRejectedValue(err);
    await expect(fetchPdfBlob('/x/pdf')).rejects.toBe(err);
    expect(err.response.data).toBe(body);
  });
});

describe('openPdfTab / canShowPdf', () => {
  beforeEach(() => setViewer(undefined));

  it('opens a tab titled as preparing when the browser has a PDF viewer', () => {
    const tab = { document: { title: '', body: { textContent: '' } } } as unknown as Window;
    const open = vi.spyOn(window, 'open').mockReturnValue(tab);
    expect(canShowPdf()).toBe(true);
    expect(openPdfTab()).toBe(tab);
    expect(open).toHaveBeenCalledWith('', '_blank');
    expect(tab.document.title).toBe('Preparing PDF…');
    open.mockRestore();
  });

  it('opens nothing where there is no PDF viewer', () => {
    setViewer(false);
    const open = vi.spyOn(window, 'open');
    expect(canShowPdf()).toBe(false);
    expect(openPdfTab()).toBeNull();
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });
});

describe('showPdf', () => {
  const blob = new Blob(['%PDF'], { type: 'application/pdf' });

  beforeEach(() => {
    vi.useFakeTimers();
    URL.createObjectURL = vi.fn(() => 'blob:abc');
    URL.revokeObjectURL = vi.fn();
  });

  it('points the pre-opened tab at the blob and revokes the URL later', () => {
    const tab = { location: { href: '' } } as unknown as Window;
    showPdf(blob, tab, 'NB-1.pdf');
    expect(tab.location.href).toBe('blob:abc');
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:abc');
  });

  it('downloads the file with its name when there is no tab', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('NB-1.pdf');
      expect(this.href).toBe('blob:abc');
    });
    showPdf(blob, null, 'NB-1.pdf');
    expect(click).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:abc');
    click.mockRestore();
  });
});
