import { matchRoute } from '../app/routeManifest';

export function createServiceCapabilities() {
  // Service/action availability only. Public IA lives in app/publicNavigation;
  // the route manifest separately opts safe pages into unavailable-state rendering.
  return {
    publicSession: true, login: true, register: true, passwordRecovery: true,
    teamWorkspace: true, adminWorkspace: true, publicPlayers: true,
    publicMatches: true, publicRecords: true, publicSearch: true,
    publicOrganizations: true, publicArchive: true, publicTeamHistory: true, resultPublishing: true,
    tournamentCreation: true, platformSettings: true, bulkApproval: true,
    ownershipTransfer: true, tournamentLifecycleWrites: true,
  } as const;
}

export type ServiceCapabilities = ReturnType<typeof createServiceCapabilities>;
export type Capability = keyof ServiceCapabilities;

export function requiredRouteCapability(path: string): Capability | undefined {
  return matchRoute(path)?.capability;
}
