import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TeamLogo } from '../src/components/common/TeamIdentity';
import { MediaBackdrop } from '../src/components/common/MediaBackdrop';
import { ApiError, apiErrorFromResponse } from '../src/services/apiError';
import { mediaUploadError } from '../src/services/mediaUploadError';
const cloud = 'https://res.cloudinary.com/fixture/image/upload/v1/aevic/teams/fixture/image.webp';
afterEach(() => vi.unstubAllEnvs());
describe('Cloudinary and legacy image presentation', () => {
  it('renders CDN images with responsive transformations and restores the original on variant failure', () => {
    const { container } = render(<><TeamLogo name="Fixture" src={cloud} /><MediaBackdrop src={cloud} alt="Banner" priority /></>);
    const images = container.querySelectorAll('img');
    expect(images).toHaveLength(2);
    images.forEach(image => {
      expect(image).toHaveAttribute('src', cloud);
      expect(image.getAttribute('srcset')).toContain('f_auto,q_auto,c_limit,w_');
      fireEvent.error(image);
      expect(image).not.toHaveAttribute('srcset');
      expect(image).toHaveAttribute('src', cloud);
    });
    fireEvent.error(images[0]);
    expect(screen.getByText('F')).toBeInTheDocument();
  });
  it('continues to accept configured Supabase and same-origin legacy media without rewriting source URLs', async () => {
    vi.stubEnv('VITE_PUBLIC_MEDIA_ORIGIN', 'https://nmjjibifcuzjlsvfcaaz.supabase.co');
    vi.resetModules();
    const { publicImageUrl } = await import('../src/utils/mediaUrl');
    const old = 'https://nmjjibifcuzjlsvfcaaz.supabase.co/storage/v1/object/public/team-logos/old.png';
    expect(publicImageUrl(old)).toBe(old);
    expect(publicImageUrl('/api/media/00000000-0000-4000-8000-000000000001')).toBe('/api/media/00000000-0000-4000-8000-000000000001');
    expect(publicImageUrl(cloud)).toBe(cloud);
  });
});
describe('safe upload failure messages', () => {
  it('preserves allowlisted upload errors without displaying vendor messages or secrets', async () => {
    const error = await apiErrorFromResponse(Response.json({ code: 'MEDIA_UPLOAD_FAILED', message: 'private vendor detail' }, { status: 503 }));
    expect(mediaUploadError(error)).toContain('Mövcud şəkliniz saxlanılıb');
    expect(mediaUploadError(error)).not.toContain('private');
  });
  it.each([[401, 'daxil'], [403, 'icazəniz'], [413, '4 MB'], [429, 'gözləyib']] as const)('explains HTTP %s', (status, message) => {
    expect(mediaUploadError(new ApiError({ status, kind: 'validation' }))).toContain(message);
  });
  it('does not assert a failed upload when a timeout leaves the result unknown', () => {
    expect(mediaUploadError(new ApiError({ status: 0, kind: 'timeout' }))).toContain('nəticəsi təsdiqlənmədi');
  });
});
