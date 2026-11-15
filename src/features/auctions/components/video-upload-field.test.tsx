import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoUploadField } from './video-upload-field';

const presign = vi.fn();
const put = vi.fn();
vi.mock('@/features/uploads/uploads.api', () => ({
  presign: (...a: unknown[]) => presign(...a),
  putToPresignedWithProgress: (...a: unknown[]) => put(...a),
}));

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

const pick = (file: File) => fireEvent.change(screen.getByLabelText('Choose video'), { target: { files: [file] } });

describe('VideoUploadField', () => {
  it('rejects a non-video file without calling the API', async () => {
    render(<VideoUploadField value={null} onChange={vi.fn()} />);
    pick(new File(['x'], 'a.mov', { type: 'video/quicktime' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Use an MP4 or WebM video.');
    expect(presign).not.toHaveBeenCalled();
  });

  it('rejects a video over 50 MB', async () => {
    render(<VideoUploadField value={null} onChange={vi.fn()} />);
    const big = new File(['x'], 'a.mp4', { type: 'video/mp4' });
    Object.defineProperty(big, 'size', { value: 51 * 1024 * 1024 });
    pick(big);
    expect(await screen.findByRole('alert')).toHaveTextContent('50 MB');
    expect(presign).not.toHaveBeenCalled();
  });

  it('uploads to auction-videos and reports the URL', async () => {
    presign.mockResolvedValue({ uploadUrl: 'https://s3/put', url: 'https://cdn/v.mp4', key: 'k' });
    put.mockResolvedValue(undefined);
    const onChange = vi.fn();
    render(<VideoUploadField value={null} onChange={onChange} />);
    pick(new File(['x'], 'a.mp4', { type: 'video/mp4' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('https://cdn/v.mp4'));
    expect(presign).toHaveBeenCalledWith({ folder: 'auction-videos', contentType: 'video/mp4', size: 1 });
  });

  it('previews the current video and removes it', () => {
    const onChange = vi.fn();
    const { container } = render(<VideoUploadField value="https://cdn/v.mp4" onChange={onChange} />);
    expect(container.querySelector('video')).toHaveAttribute('src', 'https://cdn/v.mp4');
    fireEvent.click(screen.getByRole('button', { name: /Remove video/ }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
