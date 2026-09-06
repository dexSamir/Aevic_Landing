import { matchRoute } from '../app/routeManifest';

export function createServiceCapabilities(source: 'api' | 'mock') {
  // Service/action availability only. Public IA lives in app/publicNavigation;
  // the route manifest separately opts safe pages into unavailable-state rendering.
  const mock = source === 'mock';
  return {
    publicSession: mock, login: mock, register: mock, passwordRecovery: mock,
    teamWorkspace: mock, adminWorkspace: mock, publicPlayers: mock,
    publicMatches: mock, publicRecords: mock, publicSearch: mock,
    publicOrganizations: mock, publicArchive: mock, publicTeamHistory: mock, resultPublishing: false,
    tournamentCreation: false, platformSettings: false, bulkApproval: false,
    ownershipTransfer: false, tournamentLifecycleWrites: false,
    mockPreview: mock,
  } as const;
}

export type ServiceCapabilities = ReturnType<typeof createServiceCapabilities>;
export type Capability = keyof ServiceCapabilities;

export function requiredRouteCapability(path: string): Capability | undefined {
  return matchRoute(path)?.capability;
}
