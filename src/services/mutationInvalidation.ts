import { clearQueryCache, invalidateQuery, invalidateTeamProfile } from './queryCache';

/** Mutation families correspond to public projections; private snapshots remain isolated. */
export function mutationResources(path: string): string[] {
  if (/^\/auth\//.test(path)) return [];
  if (/\/(support|notifications|following|follows|favorites)(\/|$)/.test(path)) return [path.includes('support') ? 'support:' : 'following:'];
  if (/^\/me\/(account|sessions|2fa|data-export|deletion)(\/|$)/.test(path)) return ['account:', 'session:'];
  const tournament = path.match(/^\/(?:admin\/)?tournaments\/([^/]+)/)?.[1];
  if (/^\/(?:admin\/)?tournaments(?:\/|$)/.test(path)) return ['snapshot:', tournament ? `tournament:${tournament}:` : 'tournament:', 'profile:', 'wrapped:', 'archive', 'records'];
  if (/\/(matches|results|standings)(\/|$)/.test(path)) return ['snapshot:', 'tournament:', 'match:', 'profile:', 'wrapped:', 'records', 'archive'];
  if (/^\/(?:admin\/)?teams\/[^/]+(?:\/|$)/.test(path)) return ['snapshot:', 'tournament:', 'wrapped:', 'organization:'];
  if (/\/(teams|roster|roster-requests|verification|verifications|legacy-claims|legacy-roster|registrations|media|organizations|players)(\/|$)/.test(path)) return ['snapshot:', 'profile:', 'tournament:', 'organization:', 'wrapped:'];
  // Unknown management mutations refresh private snapshots only, never all public data.
  return [];
}
export function invalidateMutation(path: string) {
  if (/^\/auth\/(login|admin\/login|logout|password-reset\/confirm)$/.test(path)) clearQueryCache('private');
  const teamId = path.match(/^\/(?:admin\/)?teams\/([^/]+)/)?.[1];
  if (teamId) invalidateTeamProfile(decodeURIComponent(teamId));
  for (const prefix of mutationResources(path)) invalidateQuery(prefix);
  if (!/^\/auth\//.test(path)) {
    invalidateQuery('snapshot:team', 'private');
    invalidateQuery('snapshot:admin', 'private');
  }
}
