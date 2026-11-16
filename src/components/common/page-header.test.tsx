import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from './page-header';

describe('PageHeader', () => {
  it('renders the title and action, no description by default', () => {
    render(<PageHeader title="Members" action={<button>New</button>} />);
    expect(screen.getByRole('heading', { name: 'Members' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders a description and a back link', () => {
    render(<PageHeader title="Detail" description="About it" backHref="/admin/x" backLabel="Back to x" />);
    expect(screen.getByText('About it')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to x' })).toHaveAttribute('href', '/admin/x');
  });
});
