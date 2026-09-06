import { readFileSync } from 'node:fs';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PageTransition, pageFamilyForPath } from '../src/components/common/Motion';
import { TeamMark } from '../src/components/common/TeamIdentity';
import { TeamForm } from '../src/components/competition/CompetitionIntelligence';
import { TournamentParticipantField } from '../src/components/competition/TournamentParticipants';
import { PublicHeader } from '../src/layouts/layouts';
import { TeamProfilePage } from '../src/pages/ProfilePages';
import { buildMatchCenterModel } from '../src/pages/SpectatorPages';
import { buildWrappedStories, canShareWrappedFile, isWrappedInteractiveTarget, shouldWrappedAutoAdvance, wrappedAdvanceIndex, wrappedNavigationDirection, wrappedPointerIntent } from '../src/pages/WrappedPage';
import { formatSharecardRoster, selectSharecardStats } from '../src/utils/teamIdentityCard';
import { publicTeamUrl } from '../src/utils/publicUrl';
import { activePublicRoute } from '../src/utils/routes';
import { deriveWrappedSummary, yearPeriod } from '../src/utils/wrapped';
import { currentTeam, matchHistory } from '../src/mocks/data';
import { mockServices } from '../src/services/mockAdapter';
import type { TournamentParticipant } from '../src/types/domain';

const participantFixtures = (count: number): TournamentParticipant[] => Array.from({ length: count }, (_, index) => ({
  team: { id: `team-${index}`, slug: `team-${index}`, name: index === 0 ? 'International Competitive Team With A Long Name' : `Team ${index + 1}`, tag: `T${index + 1}`, rosterSize: 5 },
  roster: Array.from({ length: 5 }, (__, playerIndex) => ({ id: `team-${index}-p${playerIndex}`, ign: `PLAYER${index}-${playerIndex}`, role: playerIndex === 0 ? 'captain' as const : playerIndex === 4 ? 'substitute' as const : 'starter' as const })),
  registrationStatus: 'confirmed',
}));

describe('public experience refinements', () => {
  it.each(['/login', '/register'])('%s uses the public navigation architecture', async (path) => {
    const view = render(<MemoryRouter initialEntries={[path]}><PublicHeader /></MemoryRouter>);
    const scope = within(view.container);
    expect(scope.getByRole('navigation', { name: /əsas naviqasiya/i })).toBeInTheDocument();
    expect(scope.getByRole('link', { name: 'Turnirlər' })).toHaveAttribute('href', '/tournaments');
    expect(scope.getByRole('link', { name: 'Komanda yarat' })).toHaveAttribute('href', '/register');
    expect(scope.getByRole('link', { name: 'Yarış qaydaları' })).toHaveAttribute('href', '/regulations');
    expect(scope.queryByRole('button', { name: /global axtarışı aç/i })).not.toBeInTheDocument();
    await scope.findByRole('button', { name: /hesab menyusu/i });
    view.unmount();
  });

  it('uses one shared desktop active layer without changing the four-link navbar structure', async () => {
    const view = render(<MemoryRouter initialEntries={['/tournaments']}><PublicHeader /></MemoryRouter>);
    const nav = within(view.container).getByRole('navigation', { name: /əsas naviqasiya/i });
    expect(nav.querySelectorAll('.public-nav-indicator')).toHaveLength(1);
    expect(within(nav).getAllByRole('link')).toHaveLength(4);
    expect(within(nav).getByRole('link', { name: 'Turnirlər' })).toHaveClass('active');
    await within(view.container).findByRole('button', { name: /hesab menyusu/i });
    view.unmount();
  });

  it('resolves nested public routes to the correct active destination', () => {
    expect(activePublicRoute('/')).toBe('/');
    expect(activePublicRoute('/tournaments/daily-cup-24')).toBe('/tournaments');
    expect(activePublicRoute('/teams/caspian-wolves')).toBe('/teams');
    expect(activePublicRoute('/matches/dc24-r1')).toBe('/matches');
    expect(activePublicRoute('/contact')).toBe('');
  });

  it('assigns stable page families and renders the reusable page transition wrapper', () => {
    expect(pageFamilyForPath('/')).toBe('editorial');
    expect(pageFamilyForPath('/matches')).toBe('competition');
    expect(pageFamilyForPath('/team/roster')).toBe('team');
    expect(pageFamilyForPath('/teams/caspian-wolves')).toBe('editorial');
    expect(pageFamilyForPath('/admin/results')).toBe('admin');
    expect(pageFamilyForPath('/login')).toBe('auth');
    expect(pageFamilyForPath('/account/security')).toBe('account');
    const view = render(<PageTransition routeKey="/matches" family="competition"><h1>Nəticələr</h1></PageTransition>);
    expect(view.container.firstChild).toHaveClass('motion-page', 'motion-page--competition');
    expect(view.container.firstChild).toHaveAttribute('data-route-key', '/matches');
  });

  it('provides reduced-motion fallbacks for page and navbar movement', () => {
    const css = readFileSync(`${process.cwd()}/src/styles/motion.css`, 'utf8');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('.motion-page { animation: none; }');
    expect(css).toContain('.public-nav-indicator { transition: none; }');
  });

  it('shares one restrained press language and honors transparency and contrast preferences', () => {
    const tokens = readFileSync(`${process.cwd()}/src/styles/tokens.css`, 'utf8');
    const globals = readFileSync(`${process.cwd()}/src/styles/globals.css`, 'utf8');
    const components = readFileSync(`${process.cwd()}/src/styles/components.css`, 'utf8');
    expect(tokens).toContain('--press-scale: .96');
    expect(tokens).toContain('@media (prefers-reduced-transparency: reduce)');
    expect(tokens).toContain('@media (prefers-contrast: more)');
    expect(globals).toContain('backdrop-filter: none !important');
    expect(components).toContain(".drawer-backdrop[data-state='closed']");
  });

  it('renders the latest ten placements as equal semantic form squares', () => {
    const form = Array.from({ length: 10 }, (_, index) => ({ matchId: `m-${index}`, playedAt: `2026-08-${String(20 - index).padStart(2, '0')}T18:00:00Z`, map: 'Erangel', placement: index === 0 ? 1 : index + 1, finishes: 4, points: 10, wwcd: index === 0, newest: index === 0 }));
    const view = render(<TeamForm form={form} />);
    expect(screen.getByText('Son 10 matç')).toBeInTheDocument();
    expect(view.container.querySelectorAll('.team-form__item')).toHaveLength(10);
    expect(view.container.querySelector('.team-form__item--wwcd')).toHaveTextContent('WWCD');
    expect(view.container.querySelector('.team-form__rail')).toHaveAttribute('tabindex', '0');
  });

  it.each([1, 4, 9, 10, 11])('keeps the Last 10 rail bounded for %i supplied results', (count) => {
    const form = Array.from({ length: count }, (_, index) => ({ matchId: `case-${count}-${index}`, playedAt: `2026-08-${String(20 - index).padStart(2, '0')}T18:00:00Z`, map: 'Erangel', placement: index + 1, finishes: 4, points: 10, wwcd: index === 0, newest: index === 0 }));
    const view = render(<TeamForm form={form} />);
    expect(view.container.querySelectorAll('.team-form__item')).toHaveLength(Math.min(count, 10));
    expect(view.container.querySelector('.team-form__rail')).toHaveAccessibleName(`${Math.min(count, 10)} nəticə, yenidən köhnəyə doğru; üfüqi sürüşdürün`);
  });

  it('keeps the ten-match form honest when no results exist', () => {
    render(<TeamForm form={[]} />);
    expect(screen.getByText('Hələ dərc edilmiş matç nəticəsi yoxdur.')).toBeInTheDocument();
  });

  it.each([0, 1, 3, 8, 16, 20, 32])('renders an honest participant field for %i confirmed teams', (count) => {
    const view = render(<MemoryRouter><TournamentParticipantField participants={participantFixtures(count)} /></MemoryRouter>);
    const scope = within(view.container);
    expect(view.container.querySelectorAll('.participant-field-item')).toHaveLength(count);
    if (!count) expect(scope.getByText('İştirakçılar hələ təsdiqlənməyib')).toBeInTheDocument();
    else expect(scope.getByRole('list', { name: `${count} təsdiqlənmiş iştirakçı komanda` })).toBeInTheDocument();
    view.unmount();
  });

  it('uses a button-selected mobile participant detail and preserves long-name/no-logo fallbacks', () => {
    const participants = participantFixtures(3);
    participants[1].roster[0].ign = 'PLAYER_WITH_AN_INTENTIONALLY_LONG_COMPETITIVE_IGN';
    const view = render(<MemoryRouter><TournamentParticipantField participants={participants} /></MemoryRouter>);
    const scope = within(view.container);
    const second = scope.getByRole('button', { name: 'Team 2 heyətini göstər' });
    expect(second).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(second);
    expect(second).toHaveAttribute('aria-expanded', 'true');
    expect(view.container.querySelector('.participant-field-mobile-detail')).toHaveTextContent('PLAYER_WITH_AN_INTENTIONALLY_LONG_COMPETITIVE_IGN · PLAYER1-1 · PLAYER1-2 · PLAYER1-3 · PLAYER1-4');
    expect(scope.getAllByText('International Competitive Team With A Long Name').length).toBeGreaterThan(0);
    expect(view.container.querySelector('.team-logo img')).not.toBeInTheDocument();
    expect(view.container.querySelector('.team-logo')).toHaveTextContent('IC');
    view.unmount();
  });

  it('keeps real transparent team artwork bare and missing marks in the neutral fallback frame', () => {
    const view = render(<><TeamMark name="Caspian Wolves" src="/marks/caspian-wolves.png" size="xl" /><TeamMark name="Baku Sentinels" size="xl" /></>);
    const artwork = view.container.querySelector('.team-mark--artwork');
    const fallback = view.container.querySelector('.team-mark--fallback');
    expect(artwork).toHaveClass('team-logo--xl');
    expect(artwork?.querySelector('img')).toHaveAttribute('src', '/marks/caspian-wolves.png');
    expect(fallback).toHaveTextContent('BS');
    expect(fallback?.querySelector('img')).not.toBeInTheDocument();
  });

  it('keeps tournament participation specific and public-only in the mock contract', async () => {
    const confirmed = await mockServices.tournaments.publicParticipants('daily-cup-24');
    const empty = await mockServices.tournaments.publicParticipants('rising-series-26');
    expect(confirmed.map((participant) => participant.team.id)).toEqual(['team-01', 'team-03', 'team-06', 'team-07', 'team-08', 'team-09'].sort((left, right) => Number(left.split('-')[1]) - Number(right.split('-')[1])));
    expect(empty).toEqual([]);
    expect(confirmed.every((participant) => participant.registrationStatus === 'confirmed')).toBe(true);
    expect(confirmed.flatMap((participant) => participant.roster).every((member) => !('uid' in member))).toBe(true);
  });

  it('publishes standings only for the tournament that owns the authoritative leaderboard', async () => {
    const dailyCup = await mockServices.results.leaderboard('daily-cup-24');
    const summerFinal = await mockServices.results.leaderboard('summer-final-25');
    expect(summerFinal).toHaveLength(8);
    expect(summerFinal.every((result) => result.tournamentId === 'summer-final-25')).toBe(true);
    expect(dailyCup).toEqual([]);
  });

  it('builds the NOW → NEXT → RECENT model without a dead live state', () => {
    const baseSchedule = [
      { id: 'next-2', tournamentId: 'daily-cup-24', map: 'Miramar', round: 2, stage: 'group' as const, startsAt: '2026-08-21T19:00:00Z', lobby: 'A', status: 'upcoming' as const },
      { id: 'next-1', tournamentId: 'daily-cup-24', map: 'Erangel', round: 1, stage: 'group' as const, startsAt: '2026-08-21T18:00:00Z', lobby: 'A', status: 'upcoming' as const },
    ];
    const upcomingOnly = buildMatchCenterModel(baseSchedule, []);
    expect(upcomingOnly.primary?.id).toBe('next-1');
    expect(upcomingOnly.primaryIsLive).toBe(false);
    expect(upcomingOnly.queued.map((match) => match.id)).toEqual(['next-2']);
    expect(buildMatchCenterModel([], []).primary).toBeUndefined();

    const withLive = buildMatchCenterModel([{ ...baseSchedule[0], id: 'live-1', status: 'live' as const }, ...baseSchedule], []);
    expect(withLive.primary?.id).toBe('live-1');
    expect(withLive.primaryIsLive).toBe(true);
    expect(withLive.queued.map((match) => match.id)).toEqual(['next-1', 'next-2']);

    const completed = buildMatchCenterModel([], [matchHistory[1], matchHistory[0]]);
    expect(completed.recent[0].playedAt >= completed.recent[1].playedAt).toBe(true);
  });

  it('renders the public team as one editorial flow without the old anchor navigation', async () => {
    render(<MemoryRouter initialEntries={['/teams/caspian-wolves']}><Routes><Route path="/teams/:teamSlug" element={<TeamProfilePage />} /></Routes></MemoryRouter>);
    await screen.findByRole('heading', { name: /caspian wolves/i });
    expect(screen.queryByRole('navigation', { name: /komanda profili bölmələri/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'İcmal' })).not.toBeInTheDocument();
  });
});

describe('social composition contracts', () => {
  it('formats the sharecard roster with centered dots instead of vertical names', () => {
    expect(formatSharecardRoster({ roster: currentTeam.roster })).toBe('VEGA • KHAN • RAVEN • MIRA • NOX');
  });

  it('keeps the identity sharecard career facts in one four-item stat rail', () => {
    const stats = selectSharecardStats({ teamId: currentTeam.id, teamName: currentTeam.name, profileUrl: publicTeamUrl(currentTeam.slug ?? currentTeam.id), roster: currentTeam.roster, matches: 12, wwcd: 3, championships: 1, podiums: 2 }, 'identity');
    expect(stats.map(({ label, value }) => `${value} ${label}`)).toEqual(['12 MATÇ', '3 WWCD', '1 ÇEMPİONLUQ', '2 PODİUM']);
  });

  it('uses the explicitly configured public origin without guessing a production domain', () => {
    vi.stubEnv('VITE_PUBLIC_SITE_URL', 'https://example.test');
    expect(publicTeamUrl('caspian-wolves')).toBe('https://example.test/teams/caspian-wolves');
    vi.unstubAllEnvs();
  });

  it('builds conditional Wrapped stories whose final slide stops at the last index', () => {
    const summary = deriveWrappedSummary({ team: currentTeam, period: yearPeriod(2025), matches: matchHistory });
    const stories = buildWrappedStories(summary);
    expect(stories.at(-1)?.final).toBe(true);
    expect(wrappedAdvanceIndex(stories.length - 1, stories.length)).toBe(stories.length - 1);
    expect(stories.some((story) => story.id === 'victories')).toBe(summary.wwcd > 0);
  });

  it('uses invisible left and right story interaction zones', () => {
    expect(wrappedNavigationDirection(37, 100)).toBe('previous');
    expect(wrappedNavigationDirection(38, 100)).toBe('next');
  });

  it('requires an intentional Wrapped tap or horizontal swipe', () => {
    expect(wrappedPointerIntent({ deltaX: 2, deltaY: 1, duration: 180, offsetX: 80, width: 100 })).toBe('next');
    expect(wrappedPointerIntent({ deltaX: -52, deltaY: 8, duration: 420, offsetX: 40, width: 400 })).toBe('next');
    expect(wrappedPointerIntent({ deltaX: 58, deltaY: 5, duration: 420, offsetX: 40, width: 400 })).toBe('previous');
    expect(wrappedPointerIntent({ deltaX: 8, deltaY: 70, duration: 420, offsetX: 40, width: 400 })).toBe('none');
    expect(wrappedPointerIntent({ deltaX: 18, deltaY: 4, duration: 420, offsetX: 40, width: 400 })).toBe('none');
  });

  it('protects Wrapped controls from parent navigation ownership', () => {
    const button = document.createElement('button');
    const icon = document.createElement('svg');
    button.append(icon);
    expect(isWrappedInteractiveTarget(icon)).toBe(true);
    expect(isWrappedInteractiveTarget(document.createElement('div'))).toBe(false);
  });

  it('pauses Wrapped for reduced motion and on the final slide', () => {
    const base = { index: 0, total: 4, manualPaused: false, holding: false, tabVisible: true, reducedMotion: false };
    expect(shouldWrappedAutoAdvance(base)).toBe(true);
    expect(shouldWrappedAutoAdvance({ ...base, reducedMotion: true })).toBe(false);
    expect(shouldWrappedAutoAdvance({ ...base, index: 3 })).toBe(false);
  });

  it('falls back when file sharing is unavailable', () => {
    const file = new File(['png'], 'wrapped.png', { type: 'image/png' });
    expect(canShareWrappedFile({}, file)).toBe(false);
    expect(canShareWrappedFile({ share: async () => undefined, canShare: () => true }, file)).toBe(true);
  });
});
