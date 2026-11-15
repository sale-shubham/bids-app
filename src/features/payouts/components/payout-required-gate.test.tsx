import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  settings: { data: undefined as unknown, isLoading: false },
  account: { data: undefined as unknown, isLoading: false, isError: false },
  accountEnabled: undefined as boolean | undefined,
}));
vi.mock('@/features/settings/use-settings', () => ({ usePublicSettings: () => m.settings }));
vi.mock('../use-payouts', () => ({
  usePayoutAccount: (enabled?: boolean) => {
    m.accountEnabled = enabled;
    return m.account;
  },
}));

import { PayoutRequiredGate } from './payout-required-gate';

const ui = () => (
  <PayoutRequiredGate>
    <p>the form</p>
  </PayoutRequiredGate>
);

beforeEach(() => {
  m.settings = { data: { checkoutMode: 'optional' }, isLoading: false };
  m.account = { data: null, isLoading: false, isError: false };
});

describe('PayoutRequiredGate', () => {
  it.each(['off', 'optional'])('%s mode: renders the form and does not load the payout account', (mode) => {
    m.settings = { data: { checkoutMode: mode }, isLoading: false };
    render(ui());
    expect(screen.getByText('the form')).toBeInTheDocument();
    expect(m.accountEnabled).toBe(false);
  });

  it('required + no account: notice with a link to /sell/payouts instead of the form', () => {
    m.settings = { data: { checkoutMode: 'required' }, isLoading: false };
    render(ui());
    expect(screen.queryByText('the form')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/Set up your payout account/);
    expect(screen.getByRole('link', { name: 'Go to payout account' })).toHaveAttribute('href', '/sell/payouts');
  });

  it.each(['PENDING', 'NEEDS_CLARIFICATION', 'SUSPENDED', 'REJECTED'])('required + %s account: blocked', (status) => {
    m.settings = { data: { checkoutMode: 'required' }, isLoading: false };
    m.account = { data: { status }, isLoading: false, isError: false };
    render(ui());
    expect(screen.queryByText('the form')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/not active yet/);
  });

  it('required + ACTIVE account: renders the form', () => {
    m.settings = { data: { checkoutMode: 'required' }, isLoading: false };
    m.account = { data: { status: 'ACTIVE' }, isLoading: false, isError: false };
    render(ui());
    expect(screen.getByText('the form')).toBeInTheDocument();
  });

  it('required + payout lookup failed: lets the API enforce it', () => {
    m.settings = { data: { checkoutMode: 'required' }, isLoading: false };
    m.account = { data: undefined, isLoading: false, isError: true };
    render(ui());
    expect(screen.getByText('the form')).toBeInTheDocument();
  });

  it('missing checkoutMode counts as optional', () => {
    m.settings = { data: {}, isLoading: false };
    render(ui());
    expect(screen.getByText('the form')).toBeInTheDocument();
  });
});
