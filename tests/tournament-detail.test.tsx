import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { TournamentDetailPage } from '../src/pages/PublicPages';
import * as platform from '../src/services';
import { fixtureServices } from './fixtures/component-services';
import { clearQueryCache } from '../src/services/queryCache';
import { currentTeam, tournaments, teams, matchSchedule } from './fixtures/platform-data';

vi.mock('../src/services/PlatformDataContext', () => ({ usePublicPlatformData: () => ({ tournaments, teams, leaderboardTeams: [] }) }));
const mount = () => render(<MemoryRouter initialEntries={['/tournaments/daily-cup-24']}><Routes><Route path="/tournaments/:tournamentId" element={<TournamentDetailPage />} /></Routes></MemoryRouter>);
beforeEach(async () => {
 clearQueryCache('all');
 const participants = await fixtureServices.tournaments.publicParticipants('daily-cup-24');
 vi.spyOn(platform, 'competitionNow').mockReturnValue(new Date('2026-08-04T12:00:00+04:00'));
 vi.spyOn(platform.services.tournaments, 'publicParticipants').mockResolvedValue(participants);
 vi.spyOn(platform.services.publicMatches, 'schedule').mockResolvedValue(matchSchedule);
 vi.spyOn(platform.services.publicMatches, 'history').mockResolvedValue([]);
 vi.spyOn(platform.services.results, 'leaderboard').mockResolvedValue([]);
 vi.spyOn(platform.services.auth, 'getSession').mockResolvedValue({ user: currentTeam.captain, role: 'team' });
 vi.spyOn(platform.services.teams, 'current').mockResolvedValue(currentTeam);
 vi.spyOn(platform.services.tournaments, 'slots').mockResolvedValue([{ number: 1, tournamentId: tournaments[0].id, teamId: currentTeam.id, state: 'occupied' }]);
});
it('renders actual tournament values, sanctioned teams, rotation and unpublished standings', async () => {
 const view = mount();
 expect(screen.getByRole('heading', { name: tournaments[0].name })).toBeInTheDocument();
 expect(view.container.querySelector('.tournament-detail-format')).toHaveTextContent(`${tournaments[0].maxSlots} komanda`);
 expect(view.container.querySelector('.tournament-detail-format')).toHaveTextContent(`${tournaments[0].prizePool.toLocaleString('az-AZ')} AZN`);
 await screen.findByRole('link', { name: /Caspian Wolves/ });
 expect(Array.from(view.container.querySelectorAll('.tournament-map-copy h3')).map(node => node.textContent)).toEqual(['Erangel','Miramar','Rondo','Erangel']);
 expect(screen.queryByText(/sanhok/i)).not.toBeInTheDocument();
 expect(view.container.querySelectorAll('.tournament-detail-teams > li > a')).toHaveLength(6);
 expect(screen.getByRole('heading', { name: 'Ümumi sıralama dərc edilməyib' })).toBeInTheDocument();
 expect(screen.getByRole('link', { name: 'Tam qaydaları oxu' })).toHaveAttribute('href','/regulations');
 expect(screen.getByRole('link', { name: 'Matç Mərkəzində aç' })).toHaveAttribute('href','/matches');
 for (const placement of tournaments[0].pointFormula.placement) {
  const cell = within(view.container.querySelector('.tournament-detail-scoring') as HTMLElement).getByText(`#${placement.placement}`).parentElement!;
  expect(cell.querySelector('dd')).toHaveTextContent(`${placement.points}xal`);
 }
 const tabs = screen.getByRole('navigation', { name: 'Daily Cup #24 bölmələri' });
 fireEvent.click(within(tabs).getByRole('link', { name: 'Qaydalar' }));
 expect(within(tabs).getByRole('link', { name: 'Qaydalar' })).toHaveAttribute('aria-current','location');
});
it('preserves registered state and prevents duplicate registration', async () => {
 const join = vi.spyOn(platform.services.tournaments,'join'); mount();
 const button = await screen.findByRole('button', { name: 'Qeydiyyatdan keçib' });
 expect(button).toBeDisabled(); fireEvent.click(button); expect(join).not.toHaveBeenCalled();
 expect(screen.getByText('AÇIQDIR')).toBeInTheDocument();
 expect(within(screen.getByLabelText('Qalan vaxt')).getAllByText('08')).toHaveLength(1);
});
it('shows a closed registration window and disables joining after its deadline', async () => {
 vi.mocked(platform.competitionNow).mockReturnValue(new Date('2026-08-04T20:30:00+04:00'));
 vi.mocked(platform.services.tournaments.slots).mockResolvedValue([]);
 mount(); expect(screen.getByText('BAĞLIDIR')).toBeInTheDocument();
 await waitFor(() => expect(screen.getByRole('button', { name: 'Qeydiyyat bağlanıb' })).toBeDisabled());
});
it('keeps dates unpublished when the schedule has not been supplied', async () => {
 vi.mocked(platform.services.publicMatches.schedule).mockResolvedValue([]); const view = mount();
 await waitFor(() => expect(view.container.querySelectorAll('.tournament-map-status')).toHaveLength(4));
 expect(screen.getAllByText('Vaxt təsdiq gözləyir')).toHaveLength(4);
 expect(view.container.querySelector('.tournament-detail-schedule time')).toBeNull();
});
