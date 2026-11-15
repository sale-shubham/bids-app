import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { parseAccountResponse } from './payouts.parse';
import { payoutDefaults, payoutSchema, toPayoutPayload } from './payouts.schema';

const mutate = vi.hoisted(() => vi.fn());
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('./use-payouts', () => ({ useCreatePayoutAccount: () => ({ mutate, isPending: false }) }));

import { PayoutForm } from './components/payout-form';
import { PayoutStatusCard, PAYOUT_STATUS_INFO } from './components/payout-status-card';
import { PAYOUT_STATUSES } from './payouts.types';

const valid = {
  ...payoutDefaults,
  legalName: 'Asha Rao',
  businessType: 'individual' as const,
  phone: '9876543210',
  pan: 'abcde1234f',
  accountNumber: '123456789012',
  confirmAccountNumber: '123456789012',
  ifsc: 'hdfc0001234',
  beneficiaryName: 'Asha Rao',
  street1: '12 MG Road',
  city: 'Pune',
  state: 'Maharashtra',
  postalCode: '411001',
};
const issues = (v: object) => {
  const r = payoutSchema.safeParse({ ...valid, ...v });
  return r.success ? [] : r.error.issues.map((i) => i.path.join('.'));
};

describe('payoutSchema', () => {
  it('accepts valid input and upper-cases PAN / IFSC', () => {
    const r = payoutSchema.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.data).toMatchObject({ pan: 'ABCDE1234F', ifsc: 'HDFC0001234' });
  });
  it('PAN shape', () => {
    expect(issues({ pan: 'ABCD1234F' })).toContain('pan');
    expect(issues({ pan: 'ABCDE12345' })).toContain('pan');
    expect(issues({ pan: '' })).toContain('pan');
  });
  it('IFSC shape (5th char must be 0)', () => {
    expect(issues({ ifsc: 'HDFC1001234' })).toContain('ifsc');
    expect(issues({ ifsc: 'HDF0001234' })).toContain('ifsc');
  });
  it('account number is 9..18 digits and must be confirmed', () => {
    expect(issues({ accountNumber: '12345678', confirmAccountNumber: '12345678' })).toContain('accountNumber');
    expect(issues({ accountNumber: '1'.repeat(19), confirmAccountNumber: '1'.repeat(19) })).toContain('accountNumber');
    expect(issues({ accountNumber: '12345678a', confirmAccountNumber: '12345678a' })).toContain('accountNumber');
    expect(issues({ accountNumber: '123456789', confirmAccountNumber: '123456789' })).toEqual([]);
    expect(issues({ confirmAccountNumber: '999999999999' })).toContain('confirmAccountNumber');
  });
  it('phone is a 10-digit Indian mobile', () => {
    expect(issues({ phone: '1234567890' })).toContain('phone');
    expect(issues({ phone: '98765' })).toContain('phone');
    expect(issues({ phone: '98765432101' })).toContain('phone');
  });
  it('postal code is 6 digits; address and name length caps', () => {
    expect(issues({ postalCode: '41100' })).toContain('postalCode');
    expect(issues({ postalCode: '41100a' })).toContain('postalCode');
    expect(issues({ street1: 'x'.repeat(101) })).toContain('street1');
    expect(issues({ city: 'x'.repeat(61) })).toContain('city');
    expect(issues({ legalName: 'x'.repeat(121) })).toContain('legalName');
    expect(issues({ beneficiaryName: 'x'.repeat(121) })).toContain('beneficiaryName');
  });
  it('payload nests the address and drops the confirmation field', () => {
    const p = toPayoutPayload(payoutSchema.parse(valid));
    expect(p).toEqual({
      legalName: 'Asha Rao',
      businessType: 'individual',
      phone: '9876543210',
      pan: 'ABCDE1234F',
      accountNumber: '123456789012',
      ifsc: 'HDFC0001234',
      beneficiaryName: 'Asha Rao',
      address: { street1: '12 MG Road', city: 'Pune', state: 'Maharashtra', postalCode: '411001' },
    });
    expect(p).not.toHaveProperty('confirmAccountNumber');
  });
});

describe('parseAccountResponse', () => {
  it('null when there is no account', () => {
    expect(parseAccountResponse({ data: { account: null } })).toBeNull();
    expect(parseAccountResponse({})).toBeNull();
  });
  it('maps the safe fields only', () => {
    expect(parseAccountResponse({ data: { account: { status: 'ACTIVE', statusReason: null, legalName: 'A', bankLast4: '9012', ifsc: 'HDFC0001234', accountNumber: '123456789012' } } })).toEqual({
      status: 'ACTIVE',
      statusReason: null,
      legalName: 'A',
      businessType: null,
      bankLast4: '9012',
      ifsc: 'HDFC0001234',
      beneficiaryName: null,
      createdAt: null,
      updatedAt: null,
    });
  });
});

describe('PayoutForm', () => {
  it('masks both account number fields', () => {
    render(<PayoutForm />);
    expect(screen.getByLabelText(/^Account number/)).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText(/^Confirm account number/)).toHaveAttribute('type', 'password');
  });

  it('shows validation errors and does not submit an empty form', async () => {
    render(<PayoutForm />);
    await userEvent.click(screen.getByRole('button', { name: 'Submit payout details' }));
    expect(await screen.findByText(/valid PAN/)).toBeInTheDocument();
    expect(screen.getByText(/valid IFSC/)).toBeInTheDocument();
    expect(screen.getByText('Postal code must be 6 digits')).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('submits the normalised payload', async () => {
    render(<PayoutForm />);
    const type = (label: RegExp, v: string) => userEvent.type(screen.getByLabelText(label), v);
    await type(/^Legal name/, valid.legalName);
    await type(/^Mobile number/, valid.phone);
    await type(/^PAN/, valid.pan);
    await type(/^Account number/, valid.accountNumber);
    await type(/^Confirm account number/, valid.confirmAccountNumber);
    await type(/^IFSC/, valid.ifsc);
    await type(/^Account holder name/, valid.beneficiaryName);
    await type(/^Street address/, valid.street1);
    await type(/^City/, valid.city);
    await type(/^State/, valid.state);
    await type(/^Postal code/, valid.postalCode);
    await userEvent.click(screen.getByRole('button', { name: 'Submit payout details' }));
    await waitFor(() => expect(mutate).toHaveBeenCalled());
    expect(mutate.mock.calls[0][0]).toMatchObject({ pan: 'ABCDE1234F', ifsc: 'HDFC0001234', accountNumber: '123456789012', address: { postalCode: '411001' } });
  });
});

describe('PayoutStatusCard', () => {
  const account = { status: 'ACTIVE' as const, statusReason: null, legalName: 'Asha Rao', businessType: 'individual' as const, bankLast4: '9012', ifsc: 'HDFC0001234', beneficiaryName: 'Asha Rao', createdAt: null, updatedAt: null };

  it('shows only the last 4 digits of the bank account', () => {
    const { container } = render(<PayoutStatusCard account={account} />);
    expect(screen.getByText('•••• 9012')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\d{9,}/);
  });

  it.each(PAYOUT_STATUSES)('%s has an explanation', (status) => {
    render(<PayoutStatusCard account={{ ...account, status, statusReason: status === 'REJECTED' ? 'PAN mismatch' : null }} />);
    expect(screen.getByText(PAYOUT_STATUS_INFO[status].label)).toBeInTheDocument();
    expect(screen.getByText(PAYOUT_STATUS_INFO[status].explanation)).toBeInTheDocument();
    if (status === 'REJECTED') expect(screen.getByText('PAN mismatch')).toBeInTheDocument();
  });
});
