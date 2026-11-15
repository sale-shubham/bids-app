import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BuyerSaleEntry } from './buyer-sale-entry';

describe('BuyerSaleEntry (/my-bids Won rows)', () => {
  it('AWAITING_PAYMENT: Pay now to the purchase', () => {
    render(<BuyerSaleEntry saleId="s1" status="AWAITING_PAYMENT" />);
    expect(screen.getByRole('link', { name: 'Pay now' })).toHaveAttribute('href', '/purchases/s1');
  });
  it('other statuses: badge + View purchase', () => {
    render(<BuyerSaleEntry saleId="s1" status="SHIPPED" />);
    expect(screen.getByText('Shipped')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View purchase' })).toHaveAttribute('href', '/purchases/s1');
  });
});
