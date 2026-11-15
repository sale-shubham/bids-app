import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuthStore, type AuthMember } from '@/store/auth-store';
import * as api from '../notification-preferences.api';
import type { NotificationPreferences } from '../notification-preferences.api';
import { NotificationPreferencesCard } from './notification-preferences-card';
import { WhatsappCard } from './whatsapp-card';

const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('../notification-preferences.api');

const prefs = (over: Partial<NotificationPreferences> = {}): NotificationPreferences => ({
  whatsappOptIn: false,
  phoneVerified: true,
  items: [
    { type: 'outbid', label: 'Outbid', group: 'Bidding', email: true, push: true, whatsapp: false, emailLocked: false, whatsappCapable: true },
    { type: 'payment-due', label: 'Payment due', group: 'Payments', email: true, push: false, whatsapp: false, emailLocked: true, whatsappCapable: false },
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
  useAuthStore.setState({ member: { id: 'me', role: 'BIDDER', phone: '+91 98765 43210' } as AuthMember, initialized: true });
});

describe('NotificationPreferencesCard', () => {
  it('groups rows, locks mandatory email and disables WhatsApp until opted in', async () => {
    vi.mocked(api.fetchPreferences).mockResolvedValue(prefs());
    wrap(<NotificationPreferencesCard />);
    expect(await screen.findByRole('heading', { name: 'Bidding' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Payments' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Payment due email' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Outbid WhatsApp' })).toBeDisabled();
    expect(screen.queryByRole('switch', { name: 'Payment due WhatsApp' })).not.toBeInTheDocument();
  });

  it('enables WhatsApp once opted in; Save is dirty-aware and sends every row in one PUT', async () => {
    vi.mocked(api.fetchPreferences).mockResolvedValue(prefs({ whatsappOptIn: true }));
    vi.mocked(api.savePreferences).mockResolvedValue(prefs({ whatsappOptIn: true }));
    wrap(<NotificationPreferencesCard />);
    const save = await screen.findByRole('button', { name: 'Save preferences' });
    expect(save).toBeDisabled();
    await userEvent.click(screen.getByRole('switch', { name: 'Outbid WhatsApp' }));
    await userEvent.click(screen.getByRole('switch', { name: 'Outbid Push' }));
    expect(save).toBeEnabled();
    await userEvent.click(save);
    await waitFor(() =>
      expect(api.savePreferences).toHaveBeenCalledWith([
        { type: 'outbid', email: true, push: false, whatsapp: true },
        { type: 'payment-due', email: true, push: false, whatsapp: false },
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

describe('WhatsappCard', () => {
  it('links to Security when the phone is not verified', async () => {
    vi.mocked(api.fetchPreferences).mockResolvedValue(prefs({ phoneVerified: false }));
    wrap(<WhatsappCard />);
    const link = await screen.findByRole('link', { name: /Verify in Security/ });
    expect(link).toHaveAttribute('href', '/profile?tab=security');
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('shows the consent text and opts in', async () => {
    vi.mocked(api.fetchPreferences).mockResolvedValue(prefs());
    vi.mocked(api.setWhatsappOptIn).mockResolvedValue(true);
    wrap(<WhatsappCard />);
    expect(await screen.findByText(/at \+91 •••••• 3210\. You can turn this off anytime\./)).toBeInTheDocument();
    const sw = screen.getByRole('switch', { name: 'WhatsApp alerts' });
    expect(sw).not.toBeChecked();
    await userEvent.click(sw);
    await waitFor(() => expect(api.setWhatsappOptIn).toHaveBeenCalledWith(true));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'WhatsApp alerts' })).toBeChecked());
    expect(useAuthStore.getState().member?.whatsappOptIn).toBe(true);
  });
});
