import { expect, it, vi } from 'vitest';
import { publicStructuredData, serializeStructuredData } from '../src/utils/publicStructuredData';

it('identifies the current public page separately from its website and publisher', () => {
  const graph = publicStructuredData('https://example.test/regulations', 'Yarış qaydaları', 'Rəsmi yarış qaydaları.');
  expect(graph['@graph'][2]).toMatchObject({ '@type': 'WebPage', url: 'https://example.test/regulations', name: 'Yarış qaydaları', description: 'Rəsmi yarış qaydaları.' });
  expect(graph['@graph'][1]).toMatchObject({ '@id': 'https://example.test/#website', url: 'https://example.test/' });
  expect(graph['@graph'][0]).toMatchObject({ '@id': 'https://example.test/#organization' });
});

it('keeps public titles containing script delimiters inside JSON data', () => {
  const graph = publicStructuredData('https://example.test/', '</script><script>alert(1)</script>', 'AEVIC');
  const text = serializeStructuredData(graph);
  expect(text).not.toContain('<');
  expect(JSON.parse(text)).toEqual(graph);
});

vi.mock('../src/components/site/SiteContent', () => ({ useSiteHeader: () => undefined, useBranding: () => ({ name: 'AEVIC Esports', seoDescription: 'Generic brand description', assets: {} }) }));
vi.mock('../src/services', () => ({ serviceCapabilities: {} }));
vi.mock('../src/utils/publicUrl', () => ({ configuredPublicOrigin: () => 'https://example.test' }));

it('retains the public route description and updates its prerendered graph', async () => {
  const { render, cleanup } = await import('@testing-library/react');
  const { MemoryRouter } = await import('react-router-dom');
  const { RouteSeo } = await import('../src/components/common/Seo');
  vi.stubEnv('VITE_INDEXABLE_DEPLOYMENT', true);
  try {
    render(<MemoryRouter initialEntries={['/regulations']}><RouteSeo /></MemoryRouter>);
    const description = document.querySelector('meta[name="description"]')?.getAttribute('content');
    expect(description).toBeTruthy();
    expect(description).not.toBe('Generic brand description');
    const schema = JSON.parse(document.getElementById('aevic-public-schema')!.textContent!);
    expect(schema['@graph'][2]).toMatchObject({ url: 'https://example.test/regulations', description });
  } finally { cleanup(); vi.unstubAllEnvs(); document.getElementById('aevic-public-schema')?.remove(); }
});
