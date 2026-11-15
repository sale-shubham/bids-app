import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('LoginPage', () => {
  it('a normal login signs in and redirects', async () => {
    vi.mocked(authApi.login).mockResolvedValue(member);
    setup();
    await enterPassword();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/auctions'));
    expect(useAuthStore.getState().member?.id).toBe('m1');
  });
});
