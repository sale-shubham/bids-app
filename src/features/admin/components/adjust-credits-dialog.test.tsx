import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminMember } from '../admin.types';

const m = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('../use-admin', () => ({ useAdjustCredits: () => ({ mutate: m.mutate, isPending: false }) }));

import { AdjustCreditsDialog } from './adjust-credits-dialog';

const member = { id: 'm1', email: 'sam@example.com', creditBalancePaise: 20000 } as AdminMember;

beforeEach(() => vi.clearAllMocks());

describe('AdjustCreditsDialog', () => {
  it('sends a signed amount in paise with the note', async () => {
    render(<AdjustCreditsDialog member={member} onClose={vi.fn()} />);
    expect(screen.getByText(/has ₹200 in credits/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Amount/), '-50.5');
    await userEvent.type(screen.getByLabelText('Note'), 'Goodwill reversal');
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(m.mutate).toHaveBeenCalled());
    expect(m.mutate.mock.calls[0][0]).toEqual({ id: 'm1', amountPaise: -5050, note: 'Goodwill reversal' });
  });

  it('rejects zero, non-numeric amounts and a missing note', async () => {
    render(<AdjustCreditsDialog member={member} onClose={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/Amount/), '0');
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByText('The amount cannot be zero')).toBeInTheDocument();
    expect(screen.getByText('Add a short note')).toBeInTheDocument();
    expect(m.mutate).not.toHaveBeenCalled();
  });
});
