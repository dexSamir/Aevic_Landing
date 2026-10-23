import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { DirectoryTeamCard } from '../src/components/profile/DirectoryTeamCard';
vi.mock('../src/services/queryCache', () => ({ queryPolicy: { publicCompetition: 1000 }, usePlatformQuery: ({key}:{key:string}) => key.startsWith('following:') ? ({data:key==='following:session'?null:[],loading:false}) : ({ data: { form: [
  { matchId: 'one', playedAt: '2026-08-04', placement: 3, wwcd: false, map: 'Erangel' },
  { matchId: 'two', playedAt: '2026-08-03', placement: 1, wwcd: true, map: 'Miramar' },
] }, loading: false }) }));
it('reserves the gold result treatment for WWCD and uses supplied placements', () => {
  render(<MemoryRouter><DirectoryTeamCard team={{ id: 'test', slug: 'test', name: 'Test Team', rosterSize: 5, form: [{ matchId:'one', playedAt:'2026-08-04', placement:3, wwcd:false, map:'Erangel' }, { matchId:'two', playedAt:'2026-08-03', placement:1, wwcd:true, map:'Miramar' }] }} ordinal={1} compareMode={false} selected={false} ownTeam={false} onToggle={() => {}} onOpen={() => {}} /></MemoryRouter>);
  expect(screen.getByLabelText(/3-ci yer · Erangel/)).toHaveClass('recent-placement-tile');
  expect(screen.getByLabelText(/3-ci yer · Erangel/)).not.toHaveAttribute('data-winner');
  expect(screen.getByLabelText(/1-ci yer · Miramar/)).toHaveAttribute('data-winner','true');
  expect(screen.getByLabelText(/1-ci yer · Miramar/)).toHaveTextContent('WWCD');
});

it('can remove the disclosure without changing result values or other callers', async () => {
  const { RecentPlacementStrip } = await import('../src/components/common/RecentPlacementStrip');
  const results = [{matchId:'scope',placement:1,map:'Rondo',finishes:8,playedAt:'2026-08-04'}];
  const {container,rerender}=render(<RecentPlacementStrip results={results} showDetails={false}/>);
  expect(container.querySelector('details')).toBeNull();
  expect(container.querySelector('[data-winner]')).toHaveAccessibleName(/1-ci yer · Rondo.*8 kill/);
  rerender(<RecentPlacementStrip results={results}/>);
  expect(container.querySelector('summary')).toHaveTextContent('Matç detalları');
});
