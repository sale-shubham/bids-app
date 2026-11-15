import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminCategory } from '../categories.types';

const m = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('../use-categories', () => ({
  useCreateCategory: () => ({ mutate: m.create, isPending: false }),
  useUpdateCategory: () => ({ mutate: m.update, isPending: false }),
}));

import { CategoryDialog } from './category-dialog';

// jsdom has no ResizeObserver (the dialog's scroll lock / popper use it).
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });

const cat = (id: string, parentId: string | null = null, over: Partial<AdminCategory> = {}): AdminCategory => ({
  id,
  slug: id,
  name: id.toUpperCase(),
  description: null,
  parentId,
  sortOrder: 0,
  isActive: true,
  attributeSchema: [],
  auctionCount: 0,
  ...over,
});
const rows = [cat('a'), cat('a1', 'a'), cat('b')];

beforeEach(() => {
  m.create.mockClear();
  m.update.mockClear();
});

describe('CategoryDialog', () => {
  it('requires a name', async () => {
    render(<CategoryDialog open onOpenChange={() => {}} rows={rows} />);
    await userEvent.click(screen.getByRole('button', { name: 'Create category' }));
    expect(await screen.findByText('At least 2 characters')).toBeInTheDocument();
    expect(m.create).not.toHaveBeenCalled();
  });

  it('creates a category with an attribute schema', async () => {
    render(<CategoryDialog open onOpenChange={() => {}} rows={rows} />);
    await userEvent.type(screen.getByLabelText(/^Name/), 'Watches');
    await userEvent.click(screen.getByRole('button', { name: 'Add attribute' }));
    await userEvent.type(screen.getByLabelText('Key'), 'case_size');
    await userEvent.type(screen.getByLabelText('Label'), 'Case size');
    await userEvent.type(screen.getByLabelText('Unit'), 'mm');
    await userEvent.click(screen.getByRole('button', { name: 'Create category' }));
    await waitFor(() => expect(m.create).toHaveBeenCalled());
    expect(m.create.mock.calls[0][0]).toMatchObject({
      name: 'Watches',
      parentId: null,
      isActive: true,
      attributeSchema: [{ key: 'case_size', label: 'Case size', type: 'text', unit: 'mm' }],
    });
  });

  it('attribute editor validates keys, select options and duplicates before saving', async () => {
    render(<CategoryDialog open onOpenChange={() => {}} rows={rows} />);
    await userEvent.type(screen.getByLabelText(/^Name/), 'Watches');
    await userEvent.click(screen.getByRole('button', { name: 'Add attribute' }));
    await userEvent.type(screen.getByLabelText('Key'), 'Bad Key');
    await userEvent.click(screen.getByRole('button', { name: 'Create category' }));
    expect(await screen.findByText(/Lowercase letters, digits and underscores/)).toBeInTheDocument();
    expect(screen.getByText('Label is required')).toBeInTheDocument();
    expect(m.create).not.toHaveBeenCalled();
  });

  it('select type shows the options field and needs at least two options', async () => {
    render(<CategoryDialog open onOpenChange={() => {}} rows={rows} />);
    await userEvent.type(screen.getByLabelText(/^Name/), 'Watches');
    await userEvent.click(screen.getByRole('button', { name: 'Add attribute' }));
    expect(screen.queryByLabelText('Options')).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Type of attribute 1'));
    await userEvent.click(await screen.findByText('Select (choose one)'));
    await userEvent.type(screen.getByLabelText('Key'), 'metal');
    await userEvent.type(screen.getByLabelText('Label'), 'Metal');
    await userEvent.type(screen.getByLabelText('Options'), 'Gold');
    await userEvent.click(screen.getByRole('button', { name: 'Create category' }));
    expect(await screen.findByText('Add at least 2 options, separated by commas')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Options'), ', Silver');
    await userEvent.click(screen.getByRole('button', { name: 'Create category' }));
    await waitFor(() => expect(m.create).toHaveBeenCalled());
    expect(m.create.mock.calls[0][0].attributeSchema).toEqual([{ key: 'metal', label: 'Metal', type: 'select', options: ['Gold', 'Silver'] }]);
  });

  it('attribute rows can be reordered and removed', async () => {
    render(<CategoryDialog open onOpenChange={() => {}} rows={rows} category={cat('x', null, { attributeSchema: [{ key: 'one', label: 'One', type: 'text' }, { key: 'two', label: 'Two', type: 'text' }] })} />);
    expect(screen.getAllByTestId('attribute-row')).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'Move attribute 2 up' }));
    expect((within(screen.getAllByTestId('attribute-row')[0]).getByLabelText('Key') as HTMLInputElement).value).toBe('two');
    await userEvent.click(screen.getByRole('button', { name: 'Remove attribute 1' }));
    expect(screen.getAllByTestId('attribute-row')).toHaveLength(1);
  });

  it('edit: the parent select excludes the category itself and its descendants', async () => {
    render(<CategoryDialog open onOpenChange={() => {}} rows={rows} category={rows[0]} />);
    await userEvent.click(screen.getByLabelText('Parent category'));
    const listbox = await screen.findByRole('listbox');
    const names = within(listbox).getAllByRole('option').map((o) => o.textContent);
    expect(names).toEqual(['Top level', 'B']);
  });

  it('edit sends a PATCH with the id', async () => {
    render(<CategoryDialog open onOpenChange={() => {}} rows={rows} category={cat('bb', null, { name: 'Bags' })} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(m.update).toHaveBeenCalled());
    expect(m.update.mock.calls[0][0]).toMatchObject({ id: 'bb', name: 'Bags' });
  });
});
