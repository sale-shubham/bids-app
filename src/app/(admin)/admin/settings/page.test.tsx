import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminSettingsPage from './page';

const search = vi.hoisted(() => ({ q: '' }));
const replace = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/admin/settings',
  useSearchParams: () => new URLSearchParams(search.q),
}));
vi.mock('@/features/admin/components/marketplace-settings', () => ({ MarketplaceSettings: () => <div>marketplace-form</div> }));
vi.mock('@/features/admin/components/invoice-settings', () => ({ InvoiceSettings: () => <div>invoice-form</div> }));
vi.mock('@/features/admin/components/legal-settings', () => ({ LegalSettings: () => <div>legal-form</div> }));

beforeEach(() => {
  vi.clearAllMocks();
  search.q = '';
});

describe('AdminSettingsPage', () => {
  it('shows a title-only header and opens the Marketplace tab by default', () => {
    render(<AdminSettingsPage />);
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.queryByText(/Marketplace rules, invoice details/)).not.toBeInTheDocument();
    expect(screen.getByText('marketplace-form')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Invoice details' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Legal pages' })).toBeInTheDocument();
  });

  it('reads ?tab and falls back to Marketplace for an unknown value', () => {
    search.q = 'tab=legal';
    const { unmount } = render(<AdminSettingsPage />);
    expect(screen.getByText('legal-form')).toBeInTheDocument();
    unmount();
    search.q = 'tab=bogus';
    render(<AdminSettingsPage />);
    expect(screen.getByText('marketplace-form')).toBeInTheDocument();
  });

  it('writes the tab to the URL', async () => {
    render(<AdminSettingsPage />);
    await userEvent.click(screen.getByRole('tab', { name: 'Invoice details' }));
    expect(replace).toHaveBeenCalledWith(expect.stringContaining('tab=invoice'), expect.anything());
  });
});
