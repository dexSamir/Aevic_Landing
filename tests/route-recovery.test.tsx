import { render, screen } from '@testing-library/react';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { RouteError } from '../src/layouts/layouts';
import { PublicFooter } from '../src/layouts/PublicFooter';

describe('route recovery boundaries', () => {
  it('shows a branded recovery state for a failed route loader without exposing the exception', async () => {
    const router = createMemoryRouter([{ hydrateFallbackElement: <p>Yüklənir…</p>, errorElement: <RouteError />, children: [{ path: '/', loader: () => { throw new Error('private-internal-detail'); }, element: <p>Page</p> }] }]);
    render(<RouterProvider router={router} />);
    expect(await screen.findByRole('heading', { name: 'Platforma sorğunu tamamlaya bilmədi.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ana səhifəyə qayıt' })).toHaveAttribute('href', '/');
    expect(screen.queryByText(/private-internal-detail|Unexpected Application Error|Raw server/)).not.toBeInTheDocument();
  });

  it.each(['/team', '/team/roster', '/admin', '/admin/results'])('never adds public marketing to %s', (path) => {
    const { container } = render(<MemoryRouter initialEntries={[path]}><PublicFooter /></MemoryRouter>);
    expect(container).toBeEmptyDOMElement();
  });
});
