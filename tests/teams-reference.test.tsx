import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamsDirectoryPage } from '../src/pages/ProfilePages';
import { PublicFooter } from '../src/layouts/PublicFooter';
import { services } from '../src/services';
import { currentTeam, teams, tournaments, teamComparisonRecords } from './fixtures/platform-data';

vi.mock('../src/services/PlatformDataContext', () => ({ usePublicPlatformData: () => ({ teams: teams.filter(team => team.approvalStatus === 'approved' && team.slug).map(team => ({ ...team, slug: team.slug!, rosterSize: team.roster.length })), tournaments, teamComparisonRecords }) }));
vi.mock('../src/services', async importOriginal => { const actual = await importOriginal<typeof import('../src/services')>(); return { ...actual, competitionNow: () => new Date('2026-08-04T12:00:00+04:00'), services: { ...actual.services, follows: { list: vi.fn(), status: vi.fn(), mutate: vi.fn() } } }; });
function Location() { const location = useLocation(); return <output data-testid="location">{location.pathname}{location.search}</output>; }
function mount() { return render(<MemoryRouter initialEntries={['/teams']}><TeamsDirectoryPage /><PublicFooter showCta={false} /><Location /></MemoryRouter>); }
beforeEach(() => {
 vi.mocked(services.follows!.list).mockResolvedValue([]);
 vi.mocked(services.follows!.mutate).mockImplementation(async mutation=>({...mutation,source:'backend'}));
 vi.spyOn(services.auth, 'getSession').mockResolvedValue({ user: currentTeam.captain, role: 'team' });
 vi.spyOn(services.teams, 'current').mockResolvedValue(currentTeam);
 vi.spyOn(services.tournaments, 'slots').mockImplementation(async id => id === tournaments[0].id ? [{ number: 1, tournamentId: id, teamId: currentTeam.id, state: 'occupied' }] : []);
});
afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); });
describe('updated Teams reference', () => {
 it('derives own-team and registration badges from actual occupied slots', async () => {
  const view = mount();
  expect(await screen.findByText('Sizin komanda')).toBeInTheDocument();
  const badge = await screen.findByRole('link', { name: /Qeydiyyatda:/ });
  expect(badge).toHaveAttribute('href', `/tournaments/${tournaments[0].id}`);
  expect(badge.closest('.team-directory-card')).toHaveTextContent(currentTeam.name);
  expect(screen.getAllByRole('link', { name: /Qeydiyyatda:/ })).toHaveLength(1);
  expect(view.container.querySelector('.teams-directory__count strong')).toHaveTextContent(String(screen.getAllByRole('listitem').length).padStart(2, '0'));
  fireEvent.change(screen.getByRole('textbox', { name: 'Komanda adı ilə axtar' }), { target: { value: currentTeam.name } });
  expect(view.container.querySelector('.teams-directory__count strong')).toHaveTextContent('01');
  expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  expect(view.container.querySelector('.home-brand-statement')).not.toBeInTheDocument();
 });
 it('omits registration badges when no relevant tournament has an occupied team slot', async () => {
  vi.mocked(services.tournaments.slots).mockResolvedValue([]); mount();
  await screen.findByText('Sizin komanda');
  expect(screen.queryByRole('link', { name: /Qeydiyyatda:|Canlı:/ })).not.toBeInTheDocument();
 });
 it('persists follow without selecting or navigating the surrounding card', async () => {
  mount(); await screen.findByText('Sizin komanda');
  const controls = screen.getAllByRole('button', { name: 'Komandanı izlə', exact:true });
  await waitFor(()=>expect(controls[0]).toBeEnabled());
  fireEvent.click(controls[0]);
  await waitFor(()=>expect(services.follows!.mutate).toHaveBeenCalledWith({entityType:'TEAM',entityId:currentTeam.id,following:true}));
  expect(screen.getByTestId('location')).toHaveTextContent('/teams');
  fireEvent.click(screen.getByRole('button', { name: 'Müqayisə et', exact: true }));
  await waitFor(()=>expect(controls[0]).toBeEnabled());fireEvent.click(controls[0]);
  expect(screen.getAllByRole('checkbox').every(input => !(input as HTMLInputElement).checked)).toBe(true);
  expect(services.follows!.list).toHaveBeenCalled();
  expect(services.follows!.status).not.toHaveBeenCalled();
 });
 it('opens and selects whole cards using the keyboard without activating nested controls', async () => {
  mount(); await screen.findByText('Sizin komanda');
  const card = screen.getAllByRole('listitem')[0];
  fireEvent.keyDown(card, { key: 'Enter' });
  expect(screen.getByTestId('location')).toHaveTextContent(`/teams/${currentTeam.slug}`);
  fireEvent.click(screen.getByRole('button', { name: 'Müqayisə et', exact: true }));
  fireEvent.keyDown(card, { key: ' ' });
  expect(within(card).getByRole('checkbox')).toBeChecked();
  fireEvent.click(within(card).getByRole('link', { name: /Qeydiyyatda:/ }));
  expect(within(card).getByRole('checkbox')).toBeChecked();
 });
});
