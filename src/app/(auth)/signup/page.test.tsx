import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as authApi from '@/features/auth/auth.api';
import { readReferralCode } from '@/features/referrals/referral-code';
import SignupPage from './page';

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));
vi.mock('@/features/auth/auth.api');

async function fillAndSubmit() {
  await userEvent.type(screen.getByLabelText(/Full name/), 'Sam Seller');
  await userEvent.type(screen.getByLabelText('Email'), 'sam@example.com');
  await userEvent.type(screen.getByLabelText('Password'), 'secret123');
  await userEvent.type(screen.getByLabelText('Confirm password'), 'secret123');
  await userEvent.click(screen.getByRole('checkbox'));
  await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
}

const setup = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SignupPage />
    </QueryClientProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  window.history.replaceState({}, '', '/signup');
  vi.mocked(authApi.signup).mockResolvedValue({ email: 'sam@example.com', resendAfterSec: 30 });
});

describe('Signup (one MEMBER role)', () => {
  it('has no "I want to bid / sell" choice', () => {
    setup();
    expect(screen.queryByText('I want to bid')).not.toBeInTheDocument();
    expect(screen.queryByText('I want to sell')).not.toBeInTheDocument();
    expect(screen.queryByText('What would you like to do?')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });

  it('submits without a role field', async () => {
    setup();
    await fillAndSubmit();
    await waitFor(() => expect(authApi.signup).toHaveBeenCalled());
    const body = vi.mocked(authApi.signup).mock.calls[0][0];
    expect(body).toEqual({ name: 'Sam Seller', email: 'sam@example.com', password: 'secret123' });
    expect(body).not.toHaveProperty('role');
  });
});

describe('Signup referral code', () => {
  it('captures ?ref= and sends it as referralCode', async () => {
    window.history.replaceState({}, '', '/signup?ref=NOBLE7');
    setup();
    await waitFor(() => expect(readReferralCode()).toBe('NOBLE7'));
    await fillAndSubmit();
    await waitFor(() => expect(authApi.signup).toHaveBeenCalled());
    expect(vi.mocked(authApi.signup).mock.calls[0][0]).toMatchObject({ email: 'sam@example.com', referralCode: 'NOBLE7' });
    await waitFor(() => expect(readReferralCode()).toBeNull());
  });

  it('uses a code remembered from an earlier visit', async () => {
    localStorage.setItem('nb_ref', JSON.stringify({ code: 'EARLIER', expires: Date.now() + 100000 }));
    setup();
    await fillAndSubmit();
    await waitFor(() => expect(authApi.signup).toHaveBeenCalled());
    expect(vi.mocked(authApi.signup).mock.calls[0][0]).toMatchObject({ referralCode: 'EARLIER' });
  });

  it('omits referralCode when there is none', async () => {
    setup();
    await fillAndSubmit();
    await waitFor(() => expect(authApi.signup).toHaveBeenCalled());
    expect(vi.mocked(authApi.signup).mock.calls[0][0]).not.toHaveProperty('referralCode');
  });
});
