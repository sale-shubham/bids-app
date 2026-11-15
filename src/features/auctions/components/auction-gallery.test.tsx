import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuctionGallery } from './auction-gallery';

vi.mock('@/components/common/hover-gallery', () => ({ HoverGallery: () => <div /> }));
vi.mock('@/components/common/asset-image', () => ({ AssetImage: () => <div /> }));

describe('AuctionGallery', () => {
  it('opens the zoomable lightbox on click', async () => {
    const { baseElement } = render(<AuctionGallery images={['https://cdn/a.jpg', 'https://cdn/b.jpg']} title="Lamp" />);
    expect(baseElement.querySelector('.yarl__root')).toBeNull();
    fireEvent.click(screen.getByLabelText('Open image viewer'));
    expect(await screen.findByLabelText('Zoom in')).toBeInTheDocument();
    expect(baseElement.querySelector('.yarl__root')).not.toBeNull();
  });

  it('shows the video under the gallery only when there is one', () => {
    const { container, rerender } = render(<AuctionGallery images={['https://cdn/a.jpg']} title="Lamp" />);
    expect(container.querySelector('video')).toBeNull();
    rerender(<AuctionGallery images={['https://cdn/a.jpg']} title="Lamp" videoUrl="https://cdn/v.mp4" />);
    expect(container.querySelector('video')).toHaveAttribute('src', 'https://cdn/v.mp4');
  });
});
