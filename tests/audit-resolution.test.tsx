import { readFileSync } from 'node:fs';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RegistrationStepper } from '../src/components/auth/RegistrationElements';
import { SharecardGenerator } from '../src/components/competition/SharecardGenerator';
import { Tabs } from '../src/components/common/primitives';
import { AdminLayout, PublicHeader, TeamLayout, productRouteTitle } from '../src/layouts/layouts';
import { WrappedPage } from '../src/pages/WrappedPage';
import { AdminPlatformProvider, TeamPlatformProvider } from '../src/services/PlatformDataContext';
import { mockServices } from '../src/services/mockAdapter';
import type { Tournament, TournamentResultBreakdown, TournamentSlot } from '../src/types/domain';
import { publicNavigationFamily } from '../src/utils/routeMetadata';
import { capacityIsCoherent, deriveTournamentCapacity } from '../src/utils/tournamentCapacity';
import { resolveTournamentTemporalPhase } from '../src/utils/tournamentTime';

const result: TournamentResultBreakdown = {
  tournamentId: 'summer-final-25', teamId: 'team-01', stage: 'final', occurredAt: '2025-08-23T22:20:00+04:00', placement: 4, matches: 1, wwcd: 0, kills: 8,
  placementPoints: 6, killPoints: 8, penalties: 0, totalPoints: 14,
  maps: [{ matchId: 'summer-final-r4', round: 4, map: 'Erangel', placement: 2, placementPoints: 6, kills: 8, killPoints: 8, totalPoints: 14, isWWCD: false }],
};

const temporalTournament: Tournament = {
  id: 'clock-test', name: 'Clock Test', shortName: 'Clock', description: '', status: 'registration-open',
  registrationOpensAt: '2026-08-01T09:00:00Z', registrationDeadline: '2026-08-03T20:00:00Z', startsAt: '2026-08-04T18:00:00Z', endsAt: '2026-08-04T22:00:00Z',
  checkInOpensAt: '2026-08-04T16:00:00Z', checkInClosesAt: '2026-08-04T17:00:00Z', maxSlots: 20, usedSlots: 0, prizePool: 0, prizeCurrency: 'AZN', days: 1, roundsPerDay: 4,
  mapRotation: { id: 'rotation', maps: ['Erangel'] }, pointFormula: { placement: [], finishPointValue: 1, wwcdBonus: 0, defaultPenalty: 0, tieBreakRules: [] }, prizeDistribution: [], rules: [],
};

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('audit resolution data integrity', () => {
  it('renders sharecard provenance from the supplied result contract and never stale component constants', () => {
    const view = render(<MemoryRouter><SharecardGenerator tournamentId={result.tournamentId} teamName="Caspian Wolves" tournamentName="Summer Final 2025" result={result} standings={[]} provenance={{ tournamentId: result.tournamentId, occurredAt: result.occurredAt!, stageLabel: 'Final standings', sourceLabel: 'Published result' }} initialFamily="result" showFamilySelector={false} /></MemoryRouter>);
    expect(view.container).toHaveTextContent('Summer Final 2025');
    expect(view.container).toHaveTextContent('23 AUG 2025');
    expect(view.container).toHaveTextContent('Final standings');
    expect(view.container).not.toHaveTextContent('04 AUG 2026');
  });

  it('fails sharecard export closed when provenance is unavailable', () => {
    const view = render(<MemoryRouter><SharecardGenerator tournamentId={result.tournamentId} teamName="Caspian Wolves" tournamentName="Summer Final 2025" result={result} standings={[]} provenance={null} initialFamily="result" showFamilySelector={false} /></MemoryRouter>);
    expect(within(view.container).getByRole('button', { name: /png yüklə/i })).toBeDisabled();
    expect(within(view.container).getByRole('alert')).toHaveTextContent('İxrac əlçatan deyil');
  });

  it('derives every capacity category from one slot collection', () => {
    const slots: TournamentSlot[] = Array.from({ length: 20 }, (_, index) => ({ number: index + 1, tournamentId: 't1', state: index < 14 ? 'occupied' : 'available' }));
    const capacity = deriveTournamentCapacity(slots);
    expect(capacity).toEqual({ total: 20, occupied: 14, available: 6, reserved: 0 });
    expect(capacityIsCoherent(capacity)).toBe(true);
  });

  it.each([
    ['before registration', '2026-07-31T12:00:00Z', 'upcoming'],
    ['registration open', '2026-08-02T12:00:00Z', 'registration-open'],
    ['registration closed', '2026-08-03T21:00:00Z', 'registration-closed'],
    ['upcoming', '2026-08-04T17:00:00Z', 'registration-closed'],
    ['live', '2026-08-04T19:00:00Z', 'live'],
    ['completed', '2026-08-05T00:00:00Z', 'completed'],
  ])('resolves %s from a deterministic clock', (_label, now, expected) => {
    expect(resolveTournamentTemporalPhase(temporalTournament, now)).toBe(expected);
  });
});

describe('audit resolution navigation integrity', () => {
  it('covers every called-out protected route with a specific title', () => {
    const routes: Array<[string, 'team' | 'admin']> = [
      ['/team', 'team'], ['/team/tournaments', 'team'], ['/team/tournaments/daily-cup-24', 'team'], ['/team/sharecards', 'team'], ['/team/history', 'team'], ['/team/invitations', 'team'], ['/team/verification', 'team'], ['/team/organization/caspian-vanguard', 'team'], ['/team/settings', 'team'], ['/team/settings/managers', 'team'],
      ['/admin/tournaments', 'admin'], ['/admin/tournaments/daily-cup-24', 'admin'], ['/admin/check-ins/missed', 'admin'], ['/admin/verifications', 'admin'], ['/admin/support', 'admin'], ['/admin/blacklist', 'admin'], ['/admin/audit', 'admin'], ['/admin/users', 'admin'],
    ];
    routes.forEach(([path, area]) => expect(productRouteTitle(path, area)).not.toMatch(/Komanda iş sahəsi|Admin əməliyyatları/));
    expect(productRouteTitle('/team/settings/managers', 'team')).toBe('Menecerlər');
  });

  it.each([
    ['/leaderboard', '/tournaments'], ['/records', '/tournaments'], ['/archive', '/tournaments'], ['/regulations', '/tournaments'],
    ['/organizations', '/teams'], ['/following', '/teams'], ['/matches/dc24-r1', '/matches'],
  ])('maps %s to the existing public family %s', (path, family) => expect(publicNavigationFamily(path)).toBe(family));

  it('shows one exact current leaf in nested Admin navigation', async () => {
    const view = render(<MemoryRouter initialEntries={['/admin/tournaments/daily-cup-24']}><Routes><Route path="/admin" element={<AdminPlatformProvider><AdminLayout /></AdminPlatformProvider>}><Route path="tournaments/:tournamentId" element={<h1>Detail</h1>} /></Route></Routes></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Detail' });
    const nav = within(view.container).getByRole('navigation', { name: 'Admin naviqasiyası' });
    expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(within(nav).getByRole('link', { name: /^Turnirlər$/i })).toHaveAttribute('aria-current', 'page');
  });

  it('shows one exact current leaf in nested Team navigation', async () => {
    const view = render(<MemoryRouter initialEntries={['/team/settings/managers']}><Routes><Route path="/team" element={<TeamPlatformProvider><TeamLayout /></TeamPlatformProvider>}><Route path="settings/managers" element={<h1>Managers</h1>} /></Route></Routes></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Managers' });
    const nav = within(view.container).getByRole('navigation', { name: 'Məhsul naviqasiyası' });
    expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(within(nav).getByRole('link', { name: 'Menecerlər' })).toHaveAttribute('aria-current', 'page');
  });

  it('renders role-first Admin identity in the public header', async () => {
    await mockServices.auth.login('admin@example.test', 'password');
    const view = render(<MemoryRouter><PublicHeader /></MemoryRouter>);
    const trigger = await within(view.container).findByRole('button', { name: /hesab menyusu/i });
    expect(trigger).not.toHaveTextContent('Caspian Wolves');
    expect(trigger.querySelector('.team-logo')).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(await within(view.container).findByText('ADMIN ACCESS')).toBeInTheDocument();
    await mockServices.auth.login('team@example.test', 'password');
  });
});

describe('audit resolution interaction and language contracts', () => {
  it('names registration persistence as a local draft', () => {
    render(<RegistrationStepper currentStep={2} saveStatus="saved" />);
    expect(screen.getByRole('status')).toHaveTextContent('Qaralama bu cihazda saxlanıldı');
  });

  it('keeps shared tabs at 44px and reveals keyboard-focused options', async () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });
    function Example() { const [active, setActive] = useState('all'); return <Tabs active={active} onChange={setActive} items={[{ id: 'all', label: 'Hamısı' }, { id: 'pending', label: 'Pending' }, { id: 'approved', label: 'Approved' }, { id: 'rejected', label: 'Rejected' }]} />; }
    render(<Example />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Hamısı' }), { key: 'End' });
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Rejected' })).toHaveFocus());
    expect(scrollIntoView).toHaveBeenCalled();
    expect(readFileSync(`${process.cwd()}/src/styles/components.css`, 'utf8')).toContain('.tabs button { min-height: 44px;');
  });

  it('keeps the mobile participant model while densifying only desktop', () => {
    const css = readFileSync(`${process.cwd()}/src/styles/components.css`, 'utf8');
    expect(css).toContain('grid-template-columns: repeat(4, minmax(0, 1fr))');
    expect(css).toContain('.participant-field-grid { display: flex;');
    expect(css).toContain('.participant-field-grid > div { flex: 0 0 7.25rem;');
  });

  it('shows and dismisses the first-use Wrapped navigation hint', async () => {
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) });
    render(<MemoryRouter initialEntries={['/teams/caspian-wolves/wrapped/2025']}><Routes><Route path="/teams/:teamSlug/wrapped/:year" element={<WrappedPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByText(/Sol\/sağ toxun/)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => expect(screen.queryByText(/Sol\/sağ toxun/)).not.toBeInTheDocument());
  });
});
