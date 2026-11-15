import { render, screen, within } from '@testing-library/react';
import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { indexFiles, mapRows } from '../bulk.csv';
import { bulkErrorMessage, bulkRowErrors } from '../bulk.errors';
import { BulkPreviewTable } from './bulk-preview-table';

const NOW = new Date('2026-11-15T10:00:00.000Z');
const base = {
  title: 'Brass lamp',
  description: 'A polished brass lamp in working order.',
  category: 'Art',
  condition: 'NEW',
  startingBid: '100',
  startAt: 'now',
  durationHours: '24',
  images: 'a.jpg',
};

function apiError(status: number, code: string, details?: unknown) {
  return new AxiosError('x', 'ERR', undefined, undefined, {
    status,
    data: { success: false, error: { code, message: 'server says no', details } },
  } as never);
}

describe('bulk errors', () => {
  it('reads BULK_INVALID row errors by index', () => {
    const err = apiError(400, 'BULK_INVALID', { rows: [{ index: 1, errors: [{ field: 'category', message: 'Unknown category' }] }] });
    expect(bulkRowErrors(err).get(1)).toEqual([{ field: 'category', message: 'Unknown category' }]);
    expect(bulkErrorMessage(err)).toMatch(/Nothing was created/);
  });

  it('maps 429', () => {
    expect(bulkErrorMessage(apiError(429, 'TOO_MANY_REQUESTS'))).toMatch(/5 bulk uploads per hour/);
    expect(bulkRowErrors(apiError(429, 'TOO_MANY_REQUESTS')).size).toBe(0);
  });
});

describe('BulkPreviewTable', () => {
  it('renders client problems and BULK_INVALID errors beside their rows', () => {
    const rows = mapRows([base, { ...base, title: 'Second lamp', images: 'a.jpg|gone.jpg' }, { ...base, title: 'x' }], NOW);
    const files = indexFiles([new File(['x'], 'A.JPG', { type: 'image/jpeg' })]);
    const server = new Map([[0, [{ field: 'category', message: 'Unknown category' }]]]);
    render(<BulkPreviewTable rows={rows} files={files} serverErrors={server} />);

    expect(within(screen.getByTestId('bulk-row-0')).getByText('Unknown category')).toBeInTheDocument();
    expect(within(screen.getByTestId('bulk-row-1')).getByText(/No selected file named gone.jpg/)).toBeInTheDocument();
    expect(within(screen.getByTestId('bulk-row-2')).getByText(/Title must be 5-120/)).toBeInTheDocument();
  });

  it('shows OK for a clean row', () => {
    const rows = mapRows([base], NOW);
    render(<BulkPreviewTable rows={rows} files={indexFiles([new File(['x'], 'a.jpg')])} serverErrors={new Map()} />);
    expect(within(screen.getByTestId('bulk-row-0')).getByText('OK')).toBeInTheDocument();
  });
});
