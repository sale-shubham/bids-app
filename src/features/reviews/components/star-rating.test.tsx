import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RatingSummary, StarDisplay, StarRatingInput } from './star-rating';

describe('StarRatingInput', () => {
  it('clicking a star reports its value', async () => {
    const onChange = vi.fn();
    render(<StarRatingInput value={0} onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: '4 stars' }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('marks the chosen star and supports arrow keys', async () => {
    const onChange = vi.fn();
    render(<StarRatingInput value={3} onChange={onChange} />);
    expect(screen.getByRole('radio', { name: '3 stars' })).toHaveAttribute('aria-checked', 'true');
    screen.getByRole('radio', { name: '3 stars' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith(4);
    await userEvent.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  it('is inert when disabled', async () => {
    const onChange = vi.fn();
    render(<StarRatingInput value={0} onChange={onChange} disabled />);
    await userEvent.click(screen.getByRole('radio', { name: '5 stars' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('RatingSummary / StarDisplay', () => {
  it('shows average and count', () => {
    render(<RatingSummary avg={4.57} count={12} />);
    expect(screen.getByText('4.6')).toBeInTheDocument();
    expect(screen.getByText('(12)')).toBeInTheDocument();
  });
  it('shows "No ratings yet" without ratings', () => {
    render(<RatingSummary avg={null} count={0} />);
    expect(screen.getByText('No ratings yet')).toBeInTheDocument();
  });
  it('labels the display for assistive tech', () => {
    render(<StarDisplay rating={4} />);
    expect(screen.getByRole('img', { name: '4 out of 5 stars' })).toBeInTheDocument();
  });
});
