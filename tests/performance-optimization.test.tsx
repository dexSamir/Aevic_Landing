import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { DirectoryTeamCard } from '../src/components/profile/DirectoryTeamCard';
import { services } from '../src/services';
import { useTournamentClock } from '../src/utils/useTournamentClock';
import { publicImageSrcSet, restoreOriginalUpload } from '../src/utils/mediaUrl';
import { tournaments } from './fixtures/platform-data';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('renders directory result previews without N profile requests', () => {
  const read = vi.spyOn(services.profiles, 'teamBySlug');
  render(<MemoryRouter><DirectoryTeamCard team={{ id: '1', slug: '1', name: 'Fixture team', rosterSize: 5, form: [], historyAvailable: false }} ordinal={1} compareMode={false} selected={false} ownTeam={false} onToggle={() => {}} onOpen={() => {}} /></MemoryRouter>);
  expect(screen.getByText('Nəticə formatı dəstəklənmir')).toBeInTheDocument();
  expect(read).not.toHaveBeenCalled();
});

it('does not rerender a tournament page each second between lifecycle boundaries', () => {
  vi.useFakeTimers();
  let renders = 0;
  function Clock() { renders++; const now = useTournamentClock(tournaments); return <span>{now.toISOString()}</span>; }
  render(<Clock />);
  const settled = renders;
  act(() => { vi.advanceTimersByTime(60_000); });
  expect(renders).toBe(settled);
});

it('deduplicates concurrent session reads but revalidates subsequent reads', async () => {
  const actual = await vi.importActual<typeof import('../src/services')>('../src/services');
  let resolve!: (response: Response) => void;
  const fetcher = vi.fn(() => new Promise<Response>(done => { resolve = done; }));
  vi.stubGlobal('fetch', fetcher);
  const reads = [actual.services.auth.getSession(), actual.services.auth.getSession(), actual.services.auth.getSession()];
  expect(fetcher).toHaveBeenCalledTimes(1);
  resolve(new Response('null', { headers: { 'content-type': 'application/json' } }));
  await expect(Promise.all(reads)).resolves.toEqual([null, null, null]);
  const next = actual.services.auth.getSession();
  expect(fetcher).toHaveBeenCalledTimes(2);
  resolve(new Response('null', { headers: { 'content-type': 'application/json' } }));
  await next;
});

it('bounds public logo delivery and falls back once without altering originals', () => {
  vi.stubEnv('PROD', true);
  const source = '/api/media/f7b98b59-32ca-4577-a3e5-84f7185b3e22';
  expect(publicImageSrcSet(source)).toContain('w=64');
  expect(publicImageSrcSet(source)).toContain('fm=webp');
  expect(publicImageSrcSet('/api/private/file')).toBeUndefined();
  const image = document.createElement('img'); image.src = source; image.srcset = publicImageSrcSet(source)!;
  expect(restoreOriginalUpload(image)).toBe(true);
  expect(image.getAttribute('src')).toBe(source);
  expect(restoreOriginalUpload(image)).toBe(false);
});
