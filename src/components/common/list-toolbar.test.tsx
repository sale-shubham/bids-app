import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FilterSelect, ListToolbar } from './list-toolbar';

const OPTS = [{ value: 'a', label: 'Alpha' }];

describe('ListToolbar', () => {
  it('has no Filters button without panel children', () => {
    render(<ListToolbar search={<input aria-label="Search" />} />);
    expect(screen.queryByRole('button', { name: /Filters/ })).not.toBeInTheDocument();
  });

  it('toggles the panel, shows the active count and clears', async () => {
    const clear = vi.fn();
    render(
      <ListToolbar activeFilters={0} onClearFilters={clear}>
        <FilterSelect value="" onChange={() => {}} options={OPTS} allLabel="All things" ariaLabel="Thing" />
      </ListToolbar>,
    );
    expect(screen.queryByLabelText('Thing')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Filters/ }));
    expect(screen.getByLabelText('Thing')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Clear filters/ })).not.toBeInTheDocument();
  });

  it('starts open with a count and a Clear filters button when a filter is set', async () => {
    const clear = vi.fn();
    render(
      <ListToolbar activeFilters={2} onClearFilters={clear}>
        <FilterSelect value="a" onChange={() => {}} options={OPTS} allLabel="All things" ariaLabel="Thing" />
      </ListToolbar>,
    );
    expect(screen.getByRole('button', { name: /Filters\s*2/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Clear filters/ }));
    expect(clear).toHaveBeenCalled();
  });
});

describe('FilterSelect', () => {
  it('reports the all option as an empty string', async () => {
    const onChange = vi.fn();
    render(<FilterSelect value="a" onChange={onChange} options={OPTS} allLabel="All things" ariaLabel="Thing" />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Thing' }));
    await userEvent.click(await screen.findByText('All things'));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('with includeAll={false} lists no all-option and passes the picked option value', async () => {
    const onChange = vi.fn();
    const opts = [
      { value: 'ACTION_TAKEN', label: 'Action taken' },
      { value: 'DISMISSED', label: 'Dismissed' },
    ];
    render(<FilterSelect value="ACTION_TAKEN" onChange={onChange} options={opts} includeAll={false} ariaLabel="Outcome" />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Outcome' }));
    expect(await screen.findByRole('option', { name: 'Dismissed' })).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2);
    await userEvent.click(screen.getByRole('option', { name: 'Dismissed' }));
    expect(onChange).toHaveBeenCalledWith('DISMISSED');
  });
});
