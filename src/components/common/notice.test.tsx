import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Notice } from './notice';

describe('Notice', () => {
  it('warning is an alert with an optional action link', () => {
    render(<Notice action={{ label: 'Pay now', href: '/sell/commissions' }}>You owe money</Notice>);
    expect(screen.getByRole('alert')).toHaveTextContent('You owe money');
    expect(screen.getByRole('link', { name: 'Pay now' })).toHaveAttribute('href', '/sell/commissions');
  });

  it('info is a status and renders no link without an action', () => {
    render(<Notice tone="info">FYI</Notice>);
    expect(screen.getByRole('status')).toHaveTextContent('FYI');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('error is an alert', () => {
    render(<Notice tone="error">Broke</Notice>);
    expect(screen.getByRole('alert')).toHaveTextContent('Broke');
  });
});
