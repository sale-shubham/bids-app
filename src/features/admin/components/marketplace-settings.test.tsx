import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminSettings } from '../admin.types';

const m = vi.hoisted(() => ({ mutate: vi.fn(), settings: undefined as unknown }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('../use-admin', () => ({
  useAdminSettings: () => ({ data: m.settings, isLoading: false, error: null, refetch: vi.fn() }),
  useSaveSettings: () => ({ mutate: m.mutate, isPending: false }),
}));

import { MarketplaceSettings } from './marketplace-settings';

const settings = (mode: AdminSettings['checkoutMode']): AdminSettings => ({
  commissionRateBps: 500,
  minIncrementPaise: 10000,
  antiSnipingMinutes: 2,
  categories: ['Art'],
  maxPricePaise: 10_000_000_000,
  checkoutMode: mode,
  depositThresholdPaise: 10_000_000,
  depositRateBps: 1000,
});

beforeEach(() => {
  m.settings = settings('optional');
});

describe('Checkout mode select', () => {
  it('shows the current mode and its help text', () => {
    render(<MarketplaceSettings />);
    expect(screen.getByLabelText('Checkout mode')).toHaveTextContent('Optional');
    expect(screen.getByText(/Winners can pay through the platform/)).toBeInTheDocument();
  });

  it.each([
    ['off', 'Off', /arrange payment themselves/],
    ['required', 'Required', /must have an active payout account/],
  ] as const)('%s mode shows its label and help', (mode, label, help) => {
    m.settings = settings(mode);
    render(<MarketplaceSettings />);
    expect(screen.getByLabelText('Checkout mode')).toHaveTextContent(label);
    expect(screen.getByText(help)).toBeInTheDocument();
  });

  it('changing the mode and saving sends checkoutMode', async () => {
    render(<MarketplaceSettings />);
    await userEvent.click(screen.getByLabelText('Checkout mode'));
    await userEvent.click(await screen.findByText('Required'));
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    await waitFor(() => expect(m.mutate).toHaveBeenCalled());
    expect(m.mutate.mock.calls[0][0]).toMatchObject({ checkoutMode: 'required', commissionRateBps: 500 });
  });
});

describe('Bid deposit fields', () => {
  it('shows the stored threshold (rupees) and rate (percent)', () => {
    render(<MarketplaceSettings />);
    expect(screen.getByLabelText('Deposit threshold (₹, 0 = off)')).toHaveValue('100000');
    expect(screen.getByLabelText('Deposit rate (%)')).toHaveValue('10.00');
  });

  it('saving maps rupees to paise and percent to bps', async () => {
    render(<MarketplaceSettings />);
    const threshold = screen.getByLabelText('Deposit threshold (₹, 0 = off)');
    await userEvent.clear(threshold);
    await userEvent.type(threshold, '0');
    const rate = screen.getByLabelText('Deposit rate (%)');
    await userEvent.clear(rate);
    await userEvent.type(rate, '12.5');
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    await waitFor(() => expect(m.mutate).toHaveBeenCalled());
    expect(m.mutate.mock.calls[0][0]).toMatchObject({ depositThresholdPaise: 0, depositRateBps: 1250 });
  });

  it('rejects a rate outside 1-50%', async () => {
    render(<MarketplaceSettings />);
    const rate = screen.getByLabelText('Deposit rate (%)');
    await userEvent.clear(rate);
    await userEvent.type(rate, '75');
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText('Must be between 1% and 50%')).toBeInTheDocument();
    expect(m.mutate).not.toHaveBeenCalled();
  });
});
