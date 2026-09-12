import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MatchCenterPage, matchCenterMaps } from '../src/pages/SpectatorPages';
import { PublicFooter } from '../src/layouts/PublicFooter';
import { services } from '../src/services';
import { currentTeam, matchHistory, matchSchedule, tournaments } from '../src/mocks/data';
import type { PublicMatchDetail } from '../src/types/domain';

const schedule = [{ ...matchSchedule[0], status: 'live' as const }, ...matchSchedule.slice(1)];
function mount() { return render(<MemoryRouter initialEntries={['/matches']}><MatchCenterPage /><PublicFooter showCta={false} /></MemoryRouter>); }
beforeEach(() => {
  vi.spyOn(services.auth, 'getSession').mockResolvedValue(null);
  vi.spyOn(services.publicMatches, 'schedule').mockResolvedValue(schedule);
  vi.spyOn(services.publicMatches, 'history').mockResolvedValue(matchHistory);
  vi.spyOn(services.tournaments, 'list').mockResolvedValue(tournaments);
  vi.spyOn(services.publicMatches, 'get').mockImplementation(async (id) => ({ match: schedule.find((m) => m.id === id) ?? matchHistory[0], tournament: tournaments[0], published: id.startsWith('summer'), teamResults: [{ teamId: 'alpha', teamName: id === schedule[1].id ? 'Beta Squad' : 'Alpha Squad', placement: 1, finishes: 2, placementPoints: 10, totalPoints: 12, wwcd: true }] } as PublicMatchDetail));
});
afterEach(() => vi.restoreAllMocks());
describe('reference Match Center', () => {
  it('restricts real maps and normalizes unsupported demo presentation without mutating records', () => {
    const source = ['Erangel', 'Sanhok', 'Vikendi', 'Miramar', 'Rondo', 'Livik'].map((map) => ({ map }));
    expect(matchCenterMaps(source, false).map((m) => m.map)).toEqual(['Erangel', 'Miramar', 'Rondo']);
    expect(matchCenterMaps(source, true).every((m) => ['Erangel', 'Miramar', 'Rondo'].includes(m.map))).toBe(true);
    expect(source[1].map).toBe('Sanhok');
  });
  it('renders derived live state and working tabs, tournament/team filters and reset', async () => {
    mount();
    expect(await screen.findByText('1 matç canlı', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('● CANLI')).toBeInTheDocument();
    const panel = () => within(screen.getByRole('tabpanel'));
    expect(panel().getAllByRole('article')).toHaveLength(4);
    fireEvent.click(screen.getByRole('tab', { name: 'Növbəti' }));
    expect(panel().getAllByRole('article')).toHaveLength(3);
    expect(panel().queryByText('● CANLI')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Komanda'), { target: { value: 'beta' } });
    expect(panel().getAllByRole('article')).toHaveLength(1);
    expect(panel().getByRole('heading', { name: 'Miramar' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Turnir'), { target: { value: 'summer-final-25' } });
    expect(panel().queryAllByRole('article')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Təmizlə' }));
    expect(screen.getByRole('tab', { name: 'Növbəti' })).toHaveAttribute('aria-selected', 'true');
    expect(panel().getAllByRole('article')).toHaveLength(3);
    fireEvent.click(screen.getByRole('tab', { name: 'Son nəticələr' }));
    expect(panel().getAllByRole('article')).toHaveLength(4);
    expect(panel().getAllByRole('link', { name: 'Nəticələr' })).toHaveLength(4);
    expect(document.body).not.toHaveTextContent(/Sanhok|Vikendi|Livik/);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Son nəticələr' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'İndi' })).toHaveFocus();
  });
  it('reuses the Home CTA for guests and preserves the footer', async () => {
    const view = mount();
    expect(await screen.findByRole('heading', { name: /Burada oyun.*daha böyükdür/i })).toBeInTheDocument();
    expect(view.container.querySelector('.home-brand-statement__media')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Rəqabətin bir hissəsi ol' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(view.container.querySelector('.participation-band')).not.toBeInTheDocument();
  });
  it.each(['captain', 'team', 'admin', 'visitor'] as const)('hides the CTA for an authenticated %s session', async (role) => {
    vi.mocked(services.auth.getSession).mockResolvedValue({ user: currentTeam.captain, role });
    const view = mount();
    await screen.findByText('● CANLI');
    expect(view.container.querySelector('.home-brand-statement')).not.toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
  it('keeps upcoming cards visible when there is no live match', async () => {
    vi.mocked(services.publicMatches.schedule).mockResolvedValue(matchSchedule);
    mount();
    expect(await screen.findByText(/Hazırda canlı matç yoxdur/)).toBeInTheDocument();
    expect(within(screen.getByRole('tabpanel')).getAllByRole('article')).toHaveLength(4);
  });
});
