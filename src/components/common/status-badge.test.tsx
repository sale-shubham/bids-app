import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it.each([
    ['DUE', 'Due'],
    ['WAIVED', 'Waived'],
    ['CREATED', 'Created'],
    ['PAID', 'Paid'],
  ])('labels %s as %s', (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('gives DUE a warning tone and WAIVED a muted one', () => {
    const { rerender } = render(<StatusBadge status="DUE" />);
    expect(screen.getByText('Due').className).toMatch(/warning/);
    rerender(<StatusBadge status="WAIVED" />);
    expect(screen.getByText('Waived').className).toMatch(/secondary/);
  });

  it('falls back to the raw text for an unknown status', () => {
    render(<StatusBadge status="WHATEVER" />);
    expect(screen.getByText('WHATEVER')).toBeInTheDocument();
  });
});
