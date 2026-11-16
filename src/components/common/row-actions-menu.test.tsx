import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Trash2, Pencil } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { RowActionsMenu } from './row-actions-menu';

describe('RowActionsMenu', () => {
  it('renders nothing without actions', () => {
    const { container } = render(<RowActionsMenu name="X" actions={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('opens the menu and runs the selected action', async () => {
    const edit = vi.fn();
    render(
      <RowActionsMenu
        name="Vase"
        actions={[
          { label: 'Edit', icon: Pencil, onSelect: edit },
          { label: 'Delete', icon: Trash2, destructive: true, separated: true, disabled: true, hint: 'Not allowed' },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Vase' }));
    expect(await screen.findByText('Not allowed')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(edit).toHaveBeenCalled();
  });
});
