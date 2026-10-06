import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { PublicSessionProvider } from '../src/services/PublicSessionContext';
import { services } from '../src/services';
import { BrandJoinCta } from '../src/components/common/BrandJoinCta';
import { PublicFooter } from '../src/layouts/PublicFooter';
import { TournamentResults } from '../src/components/competition/TournamentResults';
import { RosterTeamCard } from '../src/components/common/RosterTeamCard';
import { currentTeam } from './fixtures/platform-data';
import type { TeamTournamentResult } from '../src/types/domain';
import { toPng } from 'html-to-image';

vi.mock('html-to-image', () => ({ toPng: vi.fn().mockResolvedValue('data:image/png;base64,test') }));
const rows: TeamTournamentResult[] = Array.from({ length: 12 }, (_, index) => ({ tournamentId: 'export-test', teamId: index === 0 ? currentTeam.id : `other-${index}`, placement: index + 1, matches: 4, wwcd: 1, finishes: 8, placementPoints: 12, finishPoints: 8, penalties: 2, totalPoints: 18 }));
const teams = [{ id: currentTeam.id, slug: 'current', name: currentTeam.name, rosterSize: currentTeam.roster.length }];
function mountResults() {
  return render(<MemoryRouter><PublicSessionProvider><TournamentResults standings={rows} teams={teams} teamNames={[]} tournamentId="export-test" tournamentName="Export test" publishedAt="2026-10-06T12:00:00Z" /></PublicSessionProvider></MemoryRouter>);
}
beforeEach(() => {
  vi.spyOn(services.auth, 'getSession').mockResolvedValue(null);
  vi.spyOn(services.teams, 'current').mockResolvedValue({ ...currentTeam, logoUrl: undefined });
  Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: Promise.resolve() } });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
});
it('removes both acquisition banners on login and restores them after logout', async () => {
  const view = render(<MemoryRouter initialEntries={['/tournaments/export-test']}><PublicSessionProvider><BrandJoinCta /><PublicFooter /></PublicSessionProvider></MemoryRouter>);
  await screen.findByRole('heading', { name: /Burada oyun/ });
  expect(view.container.querySelector('.participation-band')).not.toBeNull();
  vi.mocked(services.auth.getSession).mockResolvedValue({ user: currentTeam.captain, role: 'team' });
  act(() => window.dispatchEvent(new Event('aevic:session-change')));
  await waitFor(() => expect(view.container.querySelector('.home-brand-statement')).toBeNull());
  expect(view.container.querySelector('.participation-band')).toBeNull();
  vi.mocked(services.auth.getSession).mockResolvedValue(null);
  act(() => window.dispatchEvent(new Event('aevic:session-change')));
  await screen.findByRole('heading', { name: /Burada oyun/ });
  expect(view.container.querySelector('.participation-band')).not.toBeNull();
});
it('opens the modal, exports all standings through the existing renderer, and restores focus on Escape', async () => {
  const view = mountResults();
  const trigger = screen.getByRole('button', { name: 'Nəticələri yüklə' });
  trigger.focus(); fireEvent.click(trigger);
  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByRole('radio', { name: 'Komanda nəticəsi' })).toBeDisabled();
  const download = await within(dialog).findByRole('button', { name: 'Yüklə' });
  expect(view.container.querySelectorAll('.generated-poster--leaderboard li')).toHaveLength(12);
  fireEvent.click(download);
  await waitFor(() => expect(toPng).toHaveBeenCalled());
  expect(vi.mocked(toPng).mock.calls.at(-1)?.[0]).toHaveClass('generated-poster--leaderboard');
  fireEvent.keyDown(document, { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(trigger).toHaveFocus();
});
it('selects the authenticated team result by keyboard and exports authoritative totals', async () => {
  vi.mocked(services.auth.getSession).mockResolvedValue({ user: currentTeam.captain, role: 'team' });
  const view = mountResults();
  fireEvent.click(screen.getByRole('button', { name: 'Nəticələri yüklə' }));
  const option = await screen.findByRole('radio', { name: 'Komanda nəticəsi' });
  await waitFor(() => expect(option).toBeEnabled());
  fireEvent.keyDown(screen.getByRole('radio', { name: 'Turnir cədvəli' }), { key: 'ArrowRight' });
  expect(option).toHaveAttribute('aria-checked', 'true'); expect(option).toHaveFocus();
  const download = await screen.findByRole('button', { name: 'Yüklə' });
  const poster = view.container.querySelector('.generated-poster--result')!;
  expect(poster).toHaveTextContent(currentTeam.name);
  expect(poster).toHaveTextContent('18'); expect(poster).toHaveTextContent('−2');
  fireEvent.click(download);
  await waitFor(() => expect(vi.mocked(toPng).mock.calls.at(-1)?.[0]).toHaveClass('generated-poster--result'));
});
it('keeps the team option disabled for an authenticated team without a result', async () => {
  vi.mocked(services.auth.getSession).mockResolvedValue({ user: currentTeam.captain, role: 'team' });
  vi.mocked(services.teams.current).mockResolvedValue({ ...currentTeam, id: 'no-result' });
  mountResults(); fireEvent.click(screen.getByRole('button', { name: 'Nəticələri yüklə' }));
  expect(await screen.findByText('Komandanızın bu turnirdə dərc edilmiş nəticəsi yoxdur.')).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'Komanda nəticəsi' })).toBeDisabled();
});
it('uses supplied roster names and a single logo while preserving profile navigation', () => {
  const view = render(<MemoryRouter><RosterTeamCard name={currentTeam.name} href="/teams/current" roster={currentTeam.roster}><h3>{currentTeam.name}</h3></RosterTeamCard></MemoryRouter>);
  expect(screen.getByRole('link')).toHaveAttribute('href', '/teams/current');
  expect(view.container.querySelectorAll('.team-mark')).toHaveLength(1);
  expect(Array.from(view.container.querySelectorAll('.roster-team-card__players li')).map(node => node.textContent)).toEqual(currentTeam.roster.map(player => player.ign));
});
