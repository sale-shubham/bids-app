import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as authApi from '@/features/auth/auth.api';
import { useAuthStore, type AuthMember } from '@/store/auth-store';
import LoginPage from './page';

const replace = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));
vi.mock('@/features/auth/auth.api');

const member = { id: 'm1', role: 'BIDDER', email: 'a@b.com' } as AuthMember;

function setup() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <LoginPage />
    </QueryClientProvider>,
  );
}

async function enterPassword() {
  await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
  await userEvent.type(screen.getByLabelText('Password'), 'secret123');
  await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ member: null, initialized: true });
});

describe('LoginPage two-step flow', () => {
  it('a normal login signs in and redirects', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ member });
    setup();
    await enterPassword();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/auctions'));
    expect(useAuthStore.getState().member?.id).toBe('m1');
  });

  it('twoFactorRequired shows the code step and verifies with the challenge token', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ twoFactorRequired: true, challengeToken: 'ch-1' });
    vi.mocked(authApi.twoFactorVerify).mockResolvedValue(member);
    setup();
    await enterPassword();
    expect(await screen.findByText('Two-factor authentication')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    expect(useAuthStore.getState().member).toBeNull();
    await userEvent.type(screen.getByLabelText('Digit 1'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Verify and log in' }));
    await waitFor(() => expect(authApi.twoFactorVerify).toHaveBeenCalledWith({ challengeToken: 'ch-1', code: '123456' }, expect.anything()));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/auctions'));
    expect(useAuthStore.getState().member?.id).toBe('m1');
  });

  it('the recovery toggle submits a recoveryCode', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ twoFactorRequired: true, challengeToken: 'ch-1' });
    vi.mocked(authApi.twoFactorVerify).mockResolvedValue(member);
    setup();
    await enterPassword();
    await userEvent.click(await screen.findByRole('button', { name: 'Use a recovery code' }));
    await userEvent.type(screen.getByLabelText('Recovery code'), 'abcd-efgh-ijkl');
    await userEvent.click(screen.getByRole('button', { name: 'Verify and log in' }));
    await waitFor(() => expect(authApi.twoFactorVerify).toHaveBeenCalledWith({ challengeToken: 'ch-1', recoveryCode: 'abcd-efgh-ijkl' }, expect.anything()));
  });

  it('rejects an incomplete code without calling the API', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ twoFactorRequired: true, challengeToken: 'ch-1' });
    setup();
    await enterPassword();
    await userEvent.click(await screen.findByRole('button', { name: 'Verify and log in' }));
    expect(await screen.findByText('Enter the 6-digit code')).toBeInTheDocument();
    expect(authApi.twoFactorVerify).not.toHaveBeenCalled();
  });

  it('TWO_FACTOR_CHALLENGE_INVALID returns to the password step with a message', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ twoFactorRequired: true, challengeToken: 'ch-1' });
    const err = new AxiosError('x');
    err.response = { status: 401, data: { success: false, error: { code: 'TWO_FACTOR_CHALLENGE_INVALID', message: 'expired' } } } as AxiosResponse;
    vi.mocked(authApi.twoFactorVerify).mockRejectedValue(err);
    setup();
    await enterPassword();
    await userEvent.type(await screen.findByLabelText('Digit 1'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Verify and log in' }));
    expect(await screen.findByRole('button', { name: 'Log in' })).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/enter your password again/));
  });
});
