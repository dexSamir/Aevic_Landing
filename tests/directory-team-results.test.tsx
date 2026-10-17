import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { DirectoryTeamCard } from '../src/components/profile/DirectoryTeamCard';
vi.mock('../src/services/queryCache', () => ({ queryPolicy: { publicCompetition: 1000 }, usePlatformQuery: ({key}:{key:string}) => key.startsWith('following:') ? ({data:key==='following:session'?null:[],loading:false}) : ({ data: { form: [
  { matchId: 'one', playedAt: '2026-08-04', placement: 3, wwcd: false, map: 'Erangel' },
  { matchId: 'two', playedAt: '2026-08-03', placement: 1, wwcd: true, map: 'Miramar' },
] }, loading: false }) }));
it('reserves the gold result treatment for WWCD and uses supplied placements', () => {
  render(<MemoryRouter><DirectoryTeamCard team={{ id: 'test', slug: 'test', name: 'Test Team', rosterSize: 5 }} ordinal={1} compareMode={false} selected={false} ownTeam={false} onToggle={() => {}} onOpen={() => {}} /></MemoryRouter>);
  expect(screen.getByLabelText(/3-ci yer · Erangel/)).toHaveClass('recent-placement-tile');
  expect(screen.getByLabelText(/3-ci yer · Erangel/)).not.toHaveAttribute('data-winner');
  expect(screen.getByLabelText(/1-ci yer · Miramar/)).toHaveAttribute('data-winner','true');
  expect(screen.getByLabelText(/1-ci yer · Miramar/)).toHaveTextContent('1');
});
