import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../reports.api';
import { ReportDialog } from './report-dialog';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('../reports.api');

function setup() {
  const onOpenChange = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ReportDialog targetType="AUCTION" targetId="a1" subject="this auction" open onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  );
  return { onOpenChange };
}

beforeEach(() => vi.clearAllMocks());

describe('ReportDialog', () => {
  it('requires a reason', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Send report' }));
    expect(await screen.findByText('Choose a reason')).toBeInTheDocument();
    expect(api.createReport).not.toHaveBeenCalled();
  });

  it('submits reason + details, thanks the user and closes', async () => {
    vi.mocked(api.createReport).mockResolvedValue({ id: 'r1', status: 'OPEN' });
    const { onOpenChange } = setup();
    await userEvent.click(screen.getByRole('radio', { name: 'Fake or counterfeit item' }));
    await userEvent.type(screen.getByLabelText(/Details/), 'Logo is wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Send report' }));
    await waitFor(() =>
      expect(api.createReport).toHaveBeenCalledWith({ targetType: 'AUCTION', targetId: 'a1', reason: 'COUNTERFEIT', details: 'Logo is wrong' }, expect.anything()),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Thanks — our team will review this.'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('omits empty details', async () => {
    vi.mocked(api.createReport).mockResolvedValue({ id: 'r1', status: 'OPEN' });
    setup();
    await userEvent.click(screen.getByRole('radio', { name: 'Spam or scam' }));
    await userEvent.click(screen.getByRole('button', { name: 'Send report' }));
    await waitFor(() => expect(api.createReport).toHaveBeenCalledWith({ targetType: 'AUCTION', targetId: 'a1', reason: 'SPAM' }, expect.anything()));
  });

  it('maps ALREADY_REPORTED to friendly copy and closes', async () => {
    const err = new AxiosError('x');
    err.response = { status: 409, data: { success: false, error: { code: 'ALREADY_REPORTED', message: 'dup' } } } as AxiosResponse;
    vi.mocked(api.createReport).mockRejectedValue(err);
    const { onOpenChange } = setup();
    await userEvent.click(screen.getByRole('radio', { name: 'Something else' }));
    await userEvent.click(screen.getByRole('button', { name: 'Send report' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/already reported/)));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
