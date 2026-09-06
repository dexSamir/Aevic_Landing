import type { OrganizationTeam, Tournament } from '../types/domain';
import { publicNavigationFamily } from './routeMetadata.js';

export function activePublicRoute(pathname: string) {
  return publicNavigationFamily(pathname);
}

export function organizationTeamPath(team: Pick<OrganizationTeam, 'slug'>) {
  return `/teams/${encodeURIComponent(team.slug)}`;
}

export function tournamentById(tournaments: Tournament[], tournamentId?: string) {
  if (!tournamentId) return undefined;
  return tournaments.find((tournament) => tournament.id === tournamentId);
}

export function safeInternalPath(value: string) {
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\') || /[\u0000-\u001f]/.test(value)) return null;
  try {
    const parsed = new URL(value, 'https://aevic.invalid');
    return parsed.origin === 'https://aevic.invalid' ? `${parsed.pathname}${parsed.search}${parsed.hash}` : null;
  } catch {
    return null;
  }
}
