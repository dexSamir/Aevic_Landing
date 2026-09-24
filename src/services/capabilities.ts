import { matchRoute } from '../app/routeManifest';

export function createServiceCapabilities() {
  // Service/action availability only. Public IA lives in app/publicNavigation;
  // the route manifest separately opts safe pages into unavailable-state rendering.
  return {
    publicSession: true, login: true, register: true, passwordRecovery: true,
    teamWorkspace: true, adminWorkspace: false, publicPlayers: false,
    publicMatches: false, publicRecords: false, publicSearch: true,
    publicOrganizations: false, publicArchive: false, publicTeamHistory: true, resultPublishing: false,
    tournamentCreation: false, platformSettings: false, bulkApproval: false,
    ownershipTransfer: false, tournamentLifecycleWrites: false,
  } as const;
}

export type ServiceCapabilities = ReturnType<typeof createServiceCapabilities>;
export type Capability = keyof ServiceCapabilities;

export function requiredRouteCapability(path: string): Capability | undefined {
  return matchRoute(path)?.capability;
}
