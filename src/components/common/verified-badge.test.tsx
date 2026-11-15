import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { VerifiedBadge } from './verified-badge';

const wrap = (ui: React.ReactNode) => render(<TooltipProvider>{ui}</TooltipProvider>);

describe('VerifiedBadge', () => {
  it('renders nothing unless verified', () => {
    const { container } = wrap(<VerifiedBadge verified={false} />);
    expect(container).toBeEmptyDOMElement();
    wrap(<VerifiedBadge />);
    expect(screen.queryByLabelText('Verified seller')).not.toBeInTheDocument();
  });
  it('shows the icon with an accessible label', () => {
    wrap(<VerifiedBadge verified />);
    expect(screen.getByLabelText('Verified seller')).toBeInTheDocument();
    expect(screen.queryByText('Verified')).not.toBeInTheDocument();
  });
  it('label variant shows the word Verified', () => {
    wrap(<VerifiedBadge verified variant="label" />);
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });
});
