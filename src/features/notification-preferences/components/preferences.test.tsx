import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuthStore, type AuthMember } from '@/store/auth-store';
import * as api from '../notification-preferences.api';
import type { NotificationPreferences } from '../notification-preferences.api';
import { NotificationPreferencesCard } from './notification-preferences-card';

const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('../notification-preferences.api');

const prefs = (over: Partial<NotificationPreferences> = {}): NotificationPreferences => ({
  items: [
    { type: 'outbid', label: 'Outbid', group: 'Bidding', email: true, push: true, emailLocked: false },
    { type: 'payment-due', label: 'Payment due', group: 'Payments', email: true, push: false, emailLocked: true },
  ],
  ...over,
});

function wrap(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>{ui}</TooltipProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ member: { id: 'me', role: 'MEMBER', phone: '+91 98765 43210' } as AuthMember, initialized: true });
});

describe('NotificationPreferencesCard', () => {
  it('groups rows, locks mandatory email', async () => {
    vi.mocked(api.fetchPreferences).mockResolvedValue(prefs());
    wrap(<NotificationPreferencesCard />);
    expect(await screen.findByRole('heading', { name: 'Bidding' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Payments' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Payment due email' })).toBeDisabled();
    expect(screen.queryByText('WhatsApp')).not.toBeInTheDocument();
  });

  it('Save is dirty-aware and sends every row in one PUT', async () => {
    vi.mocked(api.fetchPreferences).mockResolvedValue(prefs());
    vi.mocked(api.savePreferences).mockResolvedValue(prefs());
    wrap(<NotificationPreferencesCard />);
    const save = await screen.findByRole('button', { name: 'Save preferences' });
    expect(save).toBeDisabled();
    await userEvent.click(screen.getByRole('switch', { name: 'Outbid Push' }));
    expect(save).toBeEnabled();
    await userEvent.click(save);
    await waitFor(() =>
      expect(api.savePreferences).toHaveBeenCalledWith([
        { type: 'outbid', email: true, push: false },
        { type: 'payment-due', email: true, push: false },
      ]),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it('toggling back to the saved value is not dirty', async () => {
    vi.mocked(api.fetchPreferences).mockResolvedValue(prefs());
    wrap(<NotificationPreferencesCard />);
    const save = await screen.findByRole('button', { name: 'Save preferences' });
    await userEvent.click(screen.getByRole('switch', { name: 'Outbid Push' }));
    await userEvent.click(screen.getByRole('switch', { name: 'Outbid Push' }));
    expect(save).toBeDisabled();
  });
});
