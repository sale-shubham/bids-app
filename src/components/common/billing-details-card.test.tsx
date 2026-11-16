import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as membersApi from '@/features/members/members.api';
import { billingSchema } from '@/features/members/members.schema';
import { useAuthStore, type AuthMember } from '@/store/auth-store';
import { BillingDetailsCard } from './billing-details-card';

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('@/features/members/members.api');

const VALID = '29ABCDE1234F1Z5';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(membersApi.updateMe).mockResolvedValue({});
  useAuthStore.setState({ member: { id: 'm1', role: 'MEMBER', gstin: null, billingState: null } as AuthMember, initialized: true });
});

const setup = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BillingDetailsCard />
    </QueryClientProvider>,
  );

describe('billingSchema', () => {
  it('accepts empty values and a valid GSTIN matching the state', () => {
    expect(billingSchema.safeParse({ gstin: '', billingState: '' }).success).toBe(true);
    expect(billingSchema.safeParse({ gstin: VALID, billingState: '29' }).success).toBe(true);
    expect(billingSchema.safeParse({ gstin: VALID.toLowerCase(), billingState: '' }).success).toBe(true);
  });
  it('rejects a malformed GSTIN or one whose first 2 digits differ from the state', () => {
    expect(billingSchema.safeParse({ gstin: '29ABCDE1234F1Z', billingState: '' }).success).toBe(false);
    const r = billingSchema.safeParse({ gstin: VALID, billingState: '27' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/first 2 digits/);
  });
});

describe('BillingDetailsCard', () => {
  it('shows a validation error for a bad GSTIN and does not save', async () => {
    setup();
    await userEvent.type(screen.getByLabelText('GSTIN'), 'BADGSTIN');
    await userEvent.click(screen.getByRole('button', { name: 'Save billing details' }));
    expect(await screen.findByText('Enter a valid 15-character GSTIN')).toBeInTheDocument();
    expect(membersApi.updateMe).not.toHaveBeenCalled();
  });

  it('saves a valid GSTIN and billing state', async () => {
    setup();
    await userEvent.type(screen.getByLabelText('GSTIN'), VALID);
    await userEvent.click(screen.getByLabelText('Billing state'));
    await userEvent.click(await screen.findByRole('option', { name: 'Karnataka (29)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save billing details' }));
    await waitFor(() => expect(membersApi.updateMe).toHaveBeenCalled());
    expect(vi.mocked(membersApi.updateMe).mock.calls[0][0]).toEqual({ gstin: VALID, billingState: '29' });
  });

  it('rejects a GSTIN that does not match the chosen state', async () => {
    setup();
    await userEvent.type(screen.getByLabelText('GSTIN'), VALID);
    await userEvent.click(screen.getByLabelText('Billing state'));
    await userEvent.click(await screen.findByRole('option', { name: 'Maharashtra (27)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save billing details' }));
    expect(await screen.findByText(/first 2 digits of the GSTIN must match/)).toBeInTheDocument();
    expect(membersApi.updateMe).not.toHaveBeenCalled();
  });
});
