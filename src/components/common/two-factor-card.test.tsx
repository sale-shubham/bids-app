import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as authApi from '@/features/auth/auth.api';
import { useAuthStore, type AuthMember } from '@/store/auth-store';
import { TwoFactorCard } from './two-factor-card';

const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/features/auth/auth.api');
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,AAAA') } }));

const signIn = (over: Partial<AuthMember> = {}) =>
  useAuthStore.setState({ member: { id: 'm1', role: 'BIDDER', twoFactorEnabled: false, ...over } as AuthMember, initialized: true });

function setup() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TwoFactorCard />
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('TwoFactorCard', () => {
  it('set up shows QR + secret, enable shows recovery codes until confirmed', async () => {
    signIn();
    vi.mocked(authApi.twoFactorSetup).mockResolvedValue({ secret: 'JBSWY3DPEHPK3PXP', otpauthUrl: 'otpauth://totp/x' });
    vi.mocked(authApi.twoFactorEnable).mockResolvedValue(['aaaa-1111', 'bbbb-2222']);
    setup();
    await userEvent.click(screen.getByRole('button', { name: /Set up/ }));
    expect(await screen.findByTestId('totp-secret')).toHaveTextContent('JBSWY3DPEHPK3PXP');
    expect(await screen.findByAltText(/QR code/)).toHaveAttribute('src', 'data:image/png;base64,AAAA');
    await userEvent.type(screen.getByLabelText('Digit 1'), '654321');
    await userEvent.click(screen.getByRole('button', { name: 'Turn on' }));
    await waitFor(() => expect(authApi.twoFactorEnable).toHaveBeenCalledWith({ code: '654321' }, expect.anything()));
    const list = await screen.findByTestId('recovery-codes');
    expect(within(list).getByText('aaaa-1111')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download \.txt/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'I saved these' }));
    expect(screen.queryByTestId('recovery-codes')).not.toBeInTheDocument();
  });

  it('turn off validates password and code before calling the API', async () => {
    signIn({ twoFactorEnabled: true });
    vi.mocked(authApi.twoFactorDisable).mockResolvedValue();
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Turn off' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Turn off' }));
    expect(await within(dialog).findByText('Password is required')).toBeInTheDocument();
    expect(within(dialog).getByText(/Enter a 6-digit code or a recovery code/)).toBeInTheDocument();
    expect(authApi.twoFactorDisable).not.toHaveBeenCalled();

    await userEvent.type(within(dialog).getByLabelText('Password'), 'secret123');
    await userEvent.type(within(dialog).getByLabelText(/Authenticator or recovery code/), '123456');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Turn off' }));
    await waitFor(() => expect(authApi.twoFactorDisable).toHaveBeenCalledWith({ password: 'secret123', code: '123456' }, expect.anything()));
  });
});
