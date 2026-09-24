import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { CompetitionRoundProgram } from '../src/components/competition/CompetitionVisuals';
import { SharecardGenerator } from '../src/components/competition/SharecardGenerator';
import { buildCompetitionAwareness, CompetitionAwareness } from '../src/components/team/CompetitionAwareness';
import { deriveNextAction } from '../src/components/team/NextActionCard';
import { productRouteTitle } from '../src/layouts/WorkspaceLayouts';
import { adminMessages, currentTeam, matchHistory, matchSchedule, notifications, teamAnnouncements, tournaments } from './fixtures/platform-data';
import { RecordDetailPage } from '../src/pages/PublicArchivePages';
import { TeamDashboardPage, TeamSharecardsPage } from '../src/pages/TeamPages';
import { TeamPlatformProvider } from '../src/services/PlatformDataContext';
import type { TournamentResultBreakdown } from '../src/types/domain';

const result: TournamentResultBreakdown = {
  tournamentId: 'daily-cup-24', teamId: 'team-01', stage: 'final', occurredAt: '2025-08-23T22:20:00+04:00', placement: 2, matches: 4, wwcd: 1, kills: 27,
  placementPoints: 44, killPoints: 27, penalties: 0, totalPoints: 71,
  maps: ['Erangel', 'Miramar', 'Rondo', 'Erangel'].map((map, index) => ({ matchId: `r-${index + 1}`, round: index + 1, map, placement: index + 1, placementPoints: 11, kills: index + 5, killPoints: index + 5, totalPoints: index + 16, isWWCD: index === 0 })),
};

describe('UX architecture reset contracts', () => {
  it('uses route-specific Team and Admin product titles', () => {
    expect(productRouteTitle('/team', 'team')).toBe('Komanda icmalı');
    expect(productRouteTitle('/team/sharecards', 'team')).toBe('Paylaşım studiyası');
    expect(productRouteTitle('/team/tournaments/daily-cup-24', 'team')).toBe('Turnir əməliyyatları');
    expect(productRouteTitle('/admin/results/result-1/correct', 'admin')).toBe('Nəticə düzəlişi');
  });

  it('keeps the captain action ahead of room, readiness and results without KPI cards', async () => {
    const view = render(<MemoryRouter><TeamPlatformProvider><TeamDashboardPage /></TeamPlatformProvider></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Caspian Wolves' });
    const command = view.container.querySelector('.overview-next-action')!;
    expect(command).toBeInTheDocument();
    for (const selector of ['.overview-status--room', '.overview-status--roster', '.overview-operations', '.overview-recent']) {
      const later = view.container.querySelector(selector)!;
      expect(later).toBeInTheDocument();
      expect(command.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(view.container.querySelector('.overview-statistics, .overview-stat-grid, .dashboard-quick-links')).not.toBeInTheDocument();
    expect(view.container.querySelectorAll('.overview-status-grid > a')).toHaveLength(4);
    expect([...view.container.querySelectorAll('.overview-recent li')].map(el => el.textContent)).toEqual(matchHistory.slice(0, 5).map(match => match.placement === 1 ? 'WWCD' : String(match.placement)));
    expect(view.container.querySelector('.overview-standings table')).not.toBeInTheDocument();
    expect(screen.getByText('Komandanız üçün cari sıralama dərc edilməyib.')).toBeInTheDocument();
    expect(view.container.querySelectorAll('.overview-rounds li')).toHaveLength(matchSchedule.length);
    const events = buildCompetitionAwareness({ notifications, adminMessages, announcements: teamAnnouncements }).slice(0, 3);
    expect(view.container.querySelectorAll('.overview-updates li')).toHaveLength(events.length);
    events.forEach(event => expect(within(view.container.querySelector('.overview-updates') as HTMLElement).getByRole('link', { name: new RegExp(event.title) })).toHaveAttribute('href', event.actionTarget));
    expect(within(command as HTMLElement).getByRole('link', { name: 'Matç detalı' })).toHaveAttribute('href', '/team/tournaments/daily-cup-24');
    expect(view.container.querySelector('.overview-status--room')).toHaveAttribute('href', '/team/tournaments/daily-cup-24#room');
    expect(view.container.querySelector('.overview-status--roster')).toHaveAttribute('href', '/team/roster');
    expect(screen.getByRole('link', { name: /Nəticə tarixçəsi/ })).toHaveAttribute('href', '/team/history');
    expect(view.container.textContent).not.toContain('AEVIC24');
    expect(view.container.textContent).not.toContain('1234567');
  });

  it('prioritizes unseen critical competition events and preserves their deep link', () => {
    const events = buildCompetitionAwareness({ notifications, adminMessages, announcements: teamAnnouncements });
    expect(events[0]).toMatchObject({
      id: 'evt-dc24-captain-briefing',
      priority: 'critical',
      readState: 'unread',
      actionTarget: '/team/messages',
    });

    const view = render(<MemoryRouter><CompetitionAwareness events={events} /></MemoryRouter>);
    expect(within(view.container).getByRole('heading', { name: 'Matç günü brifinqi' })).toBeInTheDocument();
    expect(within(view.container).getByRole('link', { name: /Mesaja bax: Matç günü brifinqi/i })).toHaveAttribute('href', '/team/messages');
    expect(within(view.container).getByText('3 görülməmiş')).toBeInTheDocument();
  });

  it('renders an honest awareness empty state without inventing activity', () => {
    render(<MemoryRouter><CompetitionAwareness events={[]} /></MemoryRouter>);
    expect(screen.getByText('Yeni dəyişiklik yoxdur')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Bildiriş tarixçəsi/i })).toHaveAttribute('href', '/team/notifications');
  });

  it('derives check-in, closed-window, and room-ready actions from authoritative state', () => {
    const tournament = tournaments[0];
    const nextMatch = matchSchedule[0];
    const baseCheckIn = { tournamentId: tournament.id, teamId: currentTeam.id, opensAt: tournament.checkInOpensAt, closesAt: tournament.checkInClosesAt };

    expect(deriveNextAction({ now: new Date('2026-08-04T20:20:00+04:00'), team: currentTeam, tournament, nextMatch, checkIn: { ...baseCheckIn, status: 'open' } }).kind).toBe('check-in');
    expect(deriveNextAction({ now: new Date('2026-08-04T20:20:00+04:00'), team: currentTeam, tournament, nextMatch, checkIn: { ...baseCheckIn, status: 'closed' } }).kind).toBe('match');
    expect(deriveNextAction({ now: new Date('2026-08-04T20:55:00+04:00'), team: currentTeam, tournament, nextMatch, checkIn: { ...baseCheckIn, status: 'checked-in' }, room: { roundId: nextMatch.id, status: 'released', releaseAt: '2026-08-04T20:52:00+04:00' } })).toMatchObject({ kind: 'room', actionLabel: 'Otaq məlumatlarını aç' });
  });

  it('offers an arrow-key asset type selector for identity, result, and leaderboard assets', async () => {
    render(<MemoryRouter><TeamPlatformProvider><TeamSharecardsPage /></TeamPlatformProvider></MemoryRouter>);
    const identity = await screen.findByRole('radio', { name: /komanda kimliyi/i });
    expect(identity).toHaveAttribute('aria-checked', 'true');
    fireEvent.keyDown(identity, { key: 'ArrowRight' });
    const resultOption = screen.getByRole('radio', { name: /turnir nəticəsi/i });
    expect(resultOption).toHaveAttribute('aria-checked', 'true');
    fireEvent.keyDown(resultOption, { key: 'End' });
    expect(screen.getByRole('radio', { name: /liderlik cədvəli/i })).toHaveAttribute('aria-checked', 'true');
    expect(await screen.findByRole('button', { name: /png yüklə/i })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /^paylaş$/i })).toBeInTheDocument();
  });

  it('keeps the result poster to one five-item metric row without top-level kill points', () => {
    const view = render(<MemoryRouter><SharecardGenerator tournamentId={result.tournamentId} teamName="Caspian Wolves" tournamentName="Daily Cup" result={result} standings={[]} provenance={{ tournamentId: result.tournamentId, occurredAt: result.occurredAt!, stageLabel: 'Final standings', sourceLabel: 'Published result' }} initialFamily="result" showFamilySelector={false} /></MemoryRouter>);
    const labels = within(view.container.querySelector('.poster-result__ledger')!).getAllByRole('term').map((node) => node.textContent);
    expect(labels).toEqual(['Matches', 'WWCD', 'Total kills', 'Placement points', 'Total points']);
    expect(labels).not.toContain('Kill points');
  });

  it('merges four map artworks and match destinations into one round program', () => {
    const rounds = result.maps.map((round) => ({ id: round.matchId, map: round.map, round: round.round, startsAt: `2026-08-04T${String(20 + round.round).padStart(2, '0')}:00:00+04:00`, status: round.round === 1 ? 'upcoming' as const : 'scheduled' as const, stageLabel: `Qrup mərhələsi · Raund ${round.round}` }));
    const view = render(<MemoryRouter><CompetitionRoundProgram rounds={rounds} tournamentId="daily-cup-24" /></MemoryRouter>);
    expect(view.container.querySelectorAll('.competition-round-program li')).toHaveLength(4);
    expect(screen.getAllByRole('link', { name: /raund \d, .* nəticələrinə keç/i })).toHaveLength(4);
    expect(screen.getAllByRole('link', { name: /raund \d, .* nəticələrinə keç/i })[0]).toHaveAttribute('href', '/tournaments/daily-cup-24#results');
    expect(view.container.querySelectorAll('.competition-round-program img')).toHaveLength(4);
  });

  it('redirects legacy record URLs into the Records Center inline detail state', async () => {
    function LocationProbe() { const location = useLocation(); return <output>{`${location.pathname}${location.search}${location.hash}`}</output>; }
    render(<MemoryRouter initialEntries={['/records/record-7']}><Routes><Route path="/records/:recordId" element={<RecordDetailPage />} /><Route path="/records" element={<LocationProbe />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('/records?record=record-7#record-detail')).toBeInTheDocument());
  });
});
