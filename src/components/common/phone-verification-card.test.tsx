import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as membersApi from '@/features/members/members.api';
import { useAuthStore, type AuthMember } from '@/store/auth-store';
import { PhoneVerificationCard } from './phone-verification-card';

const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/features/members/members.api');

const signIn = (over: Partial<AuthMember>) =>
  useAuthStore.setState({
    member: { id: 'm1', role: 'BIDDER', phone: '+91 98765 43210', phoneVerifiedAt: null, ...over } as AuthMember,
    initialized: true,
  });

function setup() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PhoneVerificationCard />
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('PhoneVerificationCard', () => {
  it('shows the verified badge when verified', () => {
    signIn({ phoneVerifiedAt: '2026-11-01T00:00:00Z' });
    setup();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Verify/ })).not.toBeInTheDocument();
  });

  it('asks for a valid number first when the profile phone cannot be verified', () => {
    signIn({ phone: null });
    setup();
    expect(screen.getByText(/Add a valid 10-digit mobile number/)).toBeInTheDocument();
  });

  it('send code, enter the 6 digits, verify updates the member', async () => {
    signIn({});
    vi.mocked(membersApi.sendPhoneOtp).mockResolvedValue({ sentTo: '******3210' });
    vi.mocked(membersApi.verifyPhone).mockResolvedValue({ phoneVerifiedAt: '2026-11-15T00:00:00Z' });
    setup();
    await userEvent.click(screen.getByRole('button', { name: /Verify \+91/ }));
    await waitFor(() => expect(membersApi.sendPhoneOtp).toHaveBeenCalledWith('9876543210', expect.anything()));
    expect(await screen.findByText('******3210')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Digit 1'), '123456');
    await waitFor(() => expect(membersApi.verifyPhone).toHaveBeenCalledWith({ phone: '9876543210', code: '123456' }, expect.anything()));
    await waitFor(() => expect(useAuthStore.getState().member?.phoneVerifiedAt).toBe('2026-11-15T00:00:00Z'));
  });
});
