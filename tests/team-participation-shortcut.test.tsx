import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TeamOverview } from '../src/components/team/TeamOverview';
import { fixtureServices } from './fixtures/component-services';
import { deriveTeamCompetitionContexts } from '../src/utils/teamCompetitionContext';
import type { TeamPlatformSnapshot } from '../src/types/domain';
import type { TeamCompetitionContext } from '../src/utils/teamCompetitionContext';
let data: TeamPlatformSnapshot;
let all: TeamCompetitionContext[];
vi.mock('../src/services/PlatformDataContext', () => ({ useTeamPlatformData: () => data, useTeamCompetitionContexts: () => ({ all, current: undefined }) }));
vi.mock('../src/components/team/TeamIntelligence', () => ({ TeamIntelligence: () => null }));
vi.mock('../src/components/team/TeamAnalytics', () => ({ TeamAnalytics: () => null }));
beforeEach(async () => {
  data = await fixtureServices.snapshots.team();
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-08-04T00:00:00Z'));
  const source = deriveTeamCompetitionContexts(data, new Date()).all[0];
  all = ['first', 'second'].map(id => ({ ...source, lifecycle: 'current', tournament: { ...source.tournament, id, name: id, status: 'published', startsAt: '2026-08-05T10:00:00Z' }, participation: { ...source.participation, status: 'confirmed', tournamentId: id } }));
});
afterEach(() => vi.useRealTimers());
it('lets captains select an active tournament and links to its withdrawal section without withdrawing', () => {
  render(<MemoryRouter><TeamOverview /></MemoryRouter>);
  const link = screen.getByRole('link', { name: 'Turnir iştirakını idarə et' });
  expect(link).toHaveAttribute('href', '/team/tournaments/first#withdrawal');
  fireEvent.change(screen.getByLabelText('Turnir'), { target: { value: 'second' } });
  expect(link).toHaveAttribute('href', '/team/tournaments/second#withdrawal');
  expect(screen.queryByRole('button', { name: 'Turnirdən çıx' })).toBeNull();
});
it('omits the shortcut when participation is withdrawn or the tournament is finished', () => {
  all[0].participation.status = 'withdrawn'; all[1].tournament.status = 'completed';
  render(<MemoryRouter><TeamOverview /></MemoryRouter>);
  expect(screen.queryByRole('link', { name: 'Turnir iştirakını idarə et' })).toBeNull();
});
