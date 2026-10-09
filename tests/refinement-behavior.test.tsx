import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { TournamentResults } from '../src/components/competition/TournamentResults';
import { publicImageSrcSet, publicImageUrl, restoreOriginalUpload } from '../src/utils/mediaUrl';
import type { PublicTeamSummary, TeamTournamentResult } from '../src/types/domain';
const session = vi.hoisted(() => ({ team: undefined as { id: string } | undefined }));
vi.mock('../src/services/PublicSessionContext', () => ({ usePublicSession: () => session }));
const teams = [{ id: 'a', slug: 'first', name: 'Same name' }, { id: 'b', slug: 'second', name: 'Same name' }] as PublicTeamSummary[];
const standings = ['a', 'b'].map((teamId, index) => ({ teamId, tournamentId: 'cup', placement: index + 1, matches: 1, wwcd: 0, placementPoints: 3, finishPoints: 2, penalties: 0, totalPoints: 5 })) as TeamTournamentResult[];
describe('standings identity', () => {
  it('highlights only the exact team ID on desktop and mobile despite duplicate names', () => {
    session.team = { id: 'b' };
    const { container } = render(<MemoryRouter><TournamentResults standings={standings} teams={teams} teamNames={[]} tournamentId="cup" /></MemoryRouter>);
    const highlighted = container.querySelectorAll('.is-own-team');
    expect(highlighted).toHaveLength(2);
    expect(within(highlighted[0] as HTMLElement).getByRole('link')).toHaveAttribute('href', '/teams/second');
    expect(screen.getAllByRole('link', { name: /Same name/ }).some(link => link.getAttribute('href') === '/teams/first')).toBe(true);
  });
  it.each([undefined, { id: 'other' }])('leaves guest or nonparticipant standings unchanged', team => {
    session.team = team;
    const { container } = render(<MemoryRouter><TournamentResults standings={standings} teams={teams} teamNames={[]} tournamentId="cup" /></MemoryRouter>);
    expect(container.querySelector('.is-own-team')).toBeNull();
  });
});
describe('mixed media delivery', () => {
  it('optimizes Cloudinary variants but preserves original-image fallback', () => {
    const url = 'https://res.cloudinary.com/fixture/image/upload/v123/aevic/teams/2/logo.webp';
    expect(publicImageUrl(url)).toBe(url);
    expect(publicImageSrcSet(url, [64, 128])).toContain('/f_auto,q_auto,c_limit,w_128/v123/');
    const image = document.createElement('img'); image.src = url; image.srcset = publicImageSrcSet(url)!;
    expect(restoreOriginalUpload(image)).toBe(true);
    expect(image.src).toBe(url);
    expect(image.hasAttribute('srcset')).toBe(false);
    expect(restoreOriginalUpload(image)).toBe(false);
    expect(publicImageUrl('/api/media/old-image')).toBe('/api/media/old-image');
    expect(publicImageUrl('https://evil.test/image.webp')).toBeUndefined();
  });
});
