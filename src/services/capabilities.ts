import { matchRoute } from '../app/routeManifest';

export function createServiceCapabilities(source: 'api' | 'mock') {
  // Service/action availability only. Public IA lives in app/publicNavigation;
  // the route manifest separately opts safe pages into unavailable-state rendering.
  const mock = source === 'mock';
  return {
    publicSession: true, login: true, register: true, passwordRecovery: true,
    teamWorkspace: true, adminWorkspace: true, publicPlayers: mock,
    publicMatches: true, publicRecords: true, publicSearch: true,
    publicOrganizations: true, publicArchive: true, publicTeamHistory: true, resultPublishing: !mock,
    tournamentCreation: !mock, platformSettings: false, bulkApproval: false,
    ownershipTransfer: !mock, tournamentLifecycleWrites: !mock,
    mockPreview: mock,
  } as const;
}

export type ServiceCapabilities = ReturnType<typeof createServiceCapabilities>;
export type Capability = keyof ServiceCapabilities;

export function requiredRouteCapability(path: string): Capability | undefined {
  return matchRoute(path)?.capability;
}
