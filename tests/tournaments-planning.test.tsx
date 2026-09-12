import { fireEvent, render, screen, within, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { TournamentsPage, registrationCountdown } from '../src/pages/TournamentsPage';
import { PublicFooter } from '../src/layouts/PublicFooter';
import { services } from '../src/services';
import { currentTeam, tournaments } from '../src/mocks/data';

vi.mock('../src/services/PlatformDataContext', () => ({ usePublicPlatformData: () => ({ tournaments }) }));
vi.mock('../src/services', async importOriginal => ({ ...await importOriginal<typeof import('../src/services')>(), competitionNow: () => new Date('2026-08-04T12:00:00+04:00') }));
function mount() { return render(<MemoryRouter initialEntries={['/tournaments']}><TournamentsPage /><PublicFooter showCta={false} /></MemoryRouter>); }
beforeEach(() => {
 vi.spyOn(services.auth, 'getSession').mockResolvedValue({ user: currentTeam.captain, role: 'team' });
 vi.spyOn(services.teams, 'current').mockResolvedValue(currentTeam);
 vi.spyOn(services.tournaments, 'slots').mockImplementation(async id => id === 'daily-cup-24' ? [{ id: 'test-slot', tournamentId: id, teamId: currentTeam.id, slotNumber: 1 }] as Awaited<ReturnType<typeof services.tournaments.slots>> : []);
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
describe('tournament reference planning page', () => {
 it('calculates real deadline values and clamps elapsed or invalid deadlines', () => {
  expect(registrationCountdown(tournaments[0].registrationDeadline, new Date('2026-08-04T12:00:00+04:00'))).toEqual({ hours: 8, minutes: 15, seconds: 0, remaining: 29700 });
  expect(registrationCountdown(tournaments[0].registrationDeadline, new Date('2027-01-01'))).toMatchObject({ remaining: 0 });
  expect(registrationCountdown('invalid', new Date())).toMatchObject({ remaining: 0 });
 });
 it('renders the feature, derived counts, registration confirmation and shared footer', async () => {
  const view = mount();
  await screen.findByText('Sizin komandanız qeydiyyatdadır');
  expect(view.container.querySelector('.planning-feature h2')).toHaveTextContent('AEVIC Daily Cup #24');
  expect(screen.getByRole('timer')).toHaveAttribute('aria-live', 'off');
  expect(screen.getByRole('button', { name: 'Hamısı (3)' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Canlı (0)' })).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /Qeydiyyatdan keçib/ }).every(button => button.hasAttribute('disabled'))).toBe(true);
  expect(view.container.querySelector('.home-brand-statement')).not.toBeInTheDocument();
  expect(screen.getByRole('contentinfo')).toBeInTheDocument();
 });
 it('filters/searches immediately and synchronizes list selection with calendar details', async () => {
  const view = mount(); await screen.findByText('Sizin komandanız qeydiyyatdadır');
  fireEvent.click(screen.getByRole('button', { name: 'Planlaşdırılıb (1)' }));
  expect(view.container.querySelectorAll('.planning-event')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Rising Squads Series təqvimdə seç' }));
  expect(view.container.querySelector('.calendar-event-inspector h3')).toHaveTextContent('Rising Squads Series');
  expect(view.container.querySelector('.tournament-calendar__days [aria-pressed=true]')).toHaveAttribute('data-calendar-date', '2026-09-12');
  expect(view.container.querySelector('.planning-event')).toHaveAttribute('data-selected', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Hamısı (3)' }));
  fireEvent.change(screen.getByRole('searchbox', { name: 'Turnir axtar' }), { target: { value: 'Summer' } });
  expect(view.container.querySelectorAll('.planning-event')).toHaveLength(1);
  fireEvent.change(screen.getByRole('searchbox', { name: 'Turnir axtar' }), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'AEVIC Daily Cup #24 təqvimdə seç' }));
  fireEvent.click(within(view.container.querySelector('.tournament-calendar__days') as HTMLElement).getByRole('button', { name: '5 avqust, turnir yoxdur' }));
  expect(screen.getByText('Bu gün turnir yoxdur.')).toBeInTheDocument();
  expect(view.container.querySelector('.planning-event[data-selected=true]')).not.toBeInTheDocument();
 });
 it('renders the exact Home CTA for a guest', async () => {
  vi.mocked(services.auth.getSession).mockResolvedValue(null); mount();
  expect(await screen.findByRole('heading', { name: /Burada oyun.*daha böyükdür/i })).toBeInTheDocument();
  expect(screen.queryByText('Sizin komandanız qeydiyyatdadır')).not.toBeInTheDocument();
 });
 it('shows the Home CTA for a signed-in account without a team', async () => {
  vi.mocked(services.teams.current).mockResolvedValue(undefined); mount();
  expect(await screen.findByRole('heading', { name: /Burada oyun.*daha böyükdür/i })).toBeInTheDocument();
 });
 it('pauses timer work while hidden and catches up when visible', async () => {
  vi.useFakeTimers(); const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false); mount();
  await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
  const label = screen.getByRole('timer').getAttribute('aria-label');
  hidden.mockReturnValue(true); fireEvent(document, new Event('visibilitychange'));
  await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
  expect(screen.getByRole('timer')).toHaveAttribute('aria-label', label);
  hidden.mockReturnValue(false); fireEvent(document, new Event('visibilitychange'));
  expect(screen.getByRole('timer')).toHaveAccessibleName('8 saat 14 dəqiqə 49 saniyə');
 });
 it('updates the timer each second and announces only deadline state changes', async () => {
  vi.useFakeTimers(); mount();
  await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
  expect(screen.getByRole('timer')).toHaveAccessibleName('8 saat 14 dəqiqə 59 saniyə');
  await act(async () => { await vi.advanceTimersByTimeAsync(29700000); });
  expect(screen.getByRole('timer')).toHaveAccessibleName('Qeydiyyat bağlıdır');
 });
 it('preserves borderless square calendar cells and a selected gold surface', () => {
  const css = readFileSync('src/components/competition/competition-schedule.css', 'utf8');
  expect(css).toMatch(/aspect-ratio:\s*1/);
  expect(css).toMatch(/\.tournament-calendar :is\([^}]+border: 0;/);
  expect(css).toMatch(/button.is-selected\s*\{[^}]*background: var\(--gold-primary\)/);
 });
});
