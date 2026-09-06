import type { PlatformServices } from './contracts';
import { requestJson } from './requestJson';
import { validatePublicSnapshot } from './snapshotValidation';

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown; nullStatuses?: number[] };

export function createApiServices(baseUrl: string): PlatformServices {
  const root = baseUrl.replace(/\/$/, '');
  const request = async <T,>(path: string, options: RequestOptions = {}): Promise<T> => {
    const { nullStatuses = [], body, ...fetchOptions } = options;
    const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
    return requestJson<T>(`${root}${path}`, {
      ...fetchOptions, credentials: 'include',
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...(csrfToken && fetchOptions.method && fetchOptions.method !== 'GET' ? { 'X-CSRF-Token': csrfToken } : {}), ...options.headers },
      body: body ? JSON.stringify(body) : undefined,
    }, nullStatuses);
  };
  const query = (values: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    Object.entries(values).forEach(([key, value]) => value && params.set(key, value));
    const serialized = params.toString();
    return serialized ? `?${serialized}` : '';
  };

  return {
    snapshots: {
      public: async (signal) => validatePublicSnapshot(await request('/public/context', { signal })),
      team: (signal) => request('/me/context', { signal }),
      admin: (signal) => request('/admin/context', { signal }),
    },
    auth: {
      getSession: () => request('/me/session', { nullStatuses: [401, 403] }),
      login: (email, password, remember = false) => request('/auth/login', { method: 'POST', body: { email, password, remember } }),
      logout: () => request('/auth/logout', { method: 'POST' }),
      requestPasswordReset: (email) => request('/auth/password-reset', { method: 'POST', body: { email } }),
      inspectPasswordReset: (token) => request(`/auth/password-reset/inspect${query({ token })}`),
      resetPassword: (token, password) => request('/auth/password-reset/confirm', { method: 'POST', body: { token, password } }),
      inspectEmailVerification: (token) => request(`/auth/email-verification/inspect${query({ token })}`),
      verifyEmail: (token) => request('/auth/email-verification/confirm', { method: 'POST', body: { token } }),
      resendVerification: (email) => request('/auth/email-verification/resend', { method: 'POST', body: { email } }),
    },
    account: {
      profile: () => request('/me/account'),
      updateProfile: (body) => request('/me/account', { method: 'PATCH', body }),
      changePassword: (currentPassword, newPassword) => request('/me/account/password', { method: 'PUT', body: { currentPassword, newPassword } }),
      sessions: () => request('/me/sessions'),
      revokeSession: (sessionId) => request(`/me/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' }),
      revokeOtherSessions: () => request('/me/sessions/others', { method: 'DELETE' }),
      twoFactorStatus: () => request('/me/2fa'),
      beginTwoFactorSetup: () => request('/me/2fa/setup', { method: 'POST' }),
      verifyTwoFactorSetup: (setupId, code) => request('/me/2fa/setup/verification', { method: 'POST', body: { setupId, code } }),
      disableTwoFactor: (password, code) => request('/me/2fa', { method: 'DELETE', body: { password, code } }),
      regenerateRecoveryCodes: (password, code) => request('/me/2fa/recovery-codes', { method: 'POST', body: { password, code } }),
      requestDataExport: () => request('/me/data-export', { method: 'POST' }),
      dataExportStatus: (jobId) => request(`/me/data-export/${encodeURIComponent(jobId)}`),
      requestDeletion: () => request('/me/deletion', { method: 'POST' }),
    },
    registration: {
      checkTeamName: (name, tournamentId) => request(`/registrations/team-name${query({ name, tournamentId })}`),
      validatePlayer: (pubgId, tournamentId) => request(`/registrations/player-eligibility${query({ pubgId, tournamentId })}`),
      lookupPlayer: (pubgId) => request(`/players/lookup${query({ pubgId })}`, { nullStatuses: [404] }),
      submit: (body) => request('/registrations', { method: 'POST', headers: { 'Idempotency-Key': body.idempotencyKey }, body }),
    },
    tournaments: {
      list: () => request('/tournaments'),
      get: (id) => request(`/tournaments/${encodeURIComponent(id)}`, { nullStatuses: [404] }),
      join: (tournamentId, teamId) => request(`/tournaments/${encodeURIComponent(tournamentId)}/entries`, { method: 'POST', body: { teamId } }),
      slots: (tournamentId) => request(`/tournaments/${encodeURIComponent(tournamentId)}/slots`),
      publicParticipants: (tournamentId) => request(`/tournaments/${encodeURIComponent(tournamentId)}/participants`),
      recap: (tournamentId) => request(`/tournaments/${encodeURIComponent(tournamentId)}/recap`, { nullStatuses: [404] }),
      calendarEvent: (tournamentId) => request(`/tournaments/${encodeURIComponent(tournamentId)}/calendar`, { nullStatuses: [404] }),
      cancel: (tournamentId, reason, idempotencyKey) => request(`/admin/tournaments/${encodeURIComponent(tournamentId)}/cancellation`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: { reason } }),
      archive: (tournamentId, idempotencyKey) => request(`/admin/tournaments/${encodeURIComponent(tournamentId)}/archive`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey } }),
      missedCheckIns: (tournamentId, cursor) => request(`/admin/check-ins/missed${query({ tournamentId, cursor })}`),
    },
    teams: {
      current: () => request('/me/team'),
      list: () => request('/teams'),
      setApproval: (teamId, status, reason) => request(`/admin/teams/${encodeURIComponent(teamId)}/approval`, { method: 'PATCH', body: { status, reason } }),
      checkIn: (tournamentId) => request(`/tournaments/${encodeURIComponent(tournamentId)}/check-in`, { method: 'POST' }),
      withdraw: (tournamentId, reason) => request(`/tournaments/${encodeURIComponent(tournamentId)}/withdraw`, { method: 'POST', body: { reason } }),
      updateSocialLinks: (teamId, socialLinks) => request(`/teams/${encodeURIComponent(teamId)}/social-links`, { method: 'PUT', body: socialLinks }),
      authority: (teamId) => request(`/teams/${encodeURIComponent(teamId)}/authority`),
      invitations: (teamId, cursor) => request(`/team-invitations${query({ teamId, cursor })}`),
      invite: (teamId, recipient, role, idempotencyKey) => request(`/teams/${encodeURIComponent(teamId)}/invitations`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: { recipient, role } }),
      cancelInvitation: (teamId, invitationId) => request(`/teams/${encodeURIComponent(teamId)}/invitations/${encodeURIComponent(invitationId)}/cancellation`, { method: 'POST' }),
      respondToInvitation: (invitationId, response, idempotencyKey) => request(`/team-invitations/${encodeURIComponent(invitationId)}/response`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: { response } }),
      removeAuthorityMember: (teamId, memberId, reason) => request(`/teams/${encodeURIComponent(teamId)}/authority/${encodeURIComponent(memberId)}`, { method: 'DELETE', body: { reason } }),
      transferOwnership: (teamId, memberId, confirmation, idempotencyKey) => request(`/teams/${encodeURIComponent(teamId)}/ownership`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: { memberId, confirmation } }),
      leave: (teamId, reason) => request(`/teams/${encodeURIComponent(teamId)}/leave`, { method: 'POST', body: { reason } }),
      archive: (teamId, reason, confirmation, idempotencyKey) => request(`/teams/${encodeURIComponent(teamId)}/archive`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: { reason, confirmation } }),
    },
    achievements: {
      listForTeam: (teamId) => request(`/teams/${encodeURIComponent(teamId)}/achievements`),
      legacyForTeam: (teamId) => request(`/teams/${encodeURIComponent(teamId)}/legacy`),
      featuredForTeam: (teamId) => request(`/teams/${encodeURIComponent(teamId)}/achievements/featured`),
      saveFeatured: (teamId, achievementIds) => request(`/teams/${encodeURIComponent(teamId)}/achievements/featured`, { method: 'PUT', body: { achievementIds } }),
    },
    organizations: {
      list: () => request('/organizations'),
      getBySlug: (slug) => request(`/organizations/${encodeURIComponent(slug)}`, { nullStatuses: [404] }),
      linkTeam: (organizationId, teamId, gameKey) => request(`/organizations/${encodeURIComponent(organizationId)}/teams`, { method: 'POST', body: { teamId, gameKey } }),
      unlinkTeam: (organizationId, teamId) => request(`/organizations/${encodeURIComponent(organizationId)}/teams/${encodeURIComponent(teamId)}`, { method: 'DELETE' }),
      updateSocialLinks: (organizationId, socialLinks) => request(`/organizations/${encodeURIComponent(organizationId)}/social-links`, { method: 'PUT', body: socialLinks }),
      create: (body, idempotencyKey) => request('/organizations', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body }),
      members: (organizationId) => request(`/organizations/${encodeURIComponent(organizationId)}/members`),
      invitations: (organizationId, cursor) => request(`/organizations/${encodeURIComponent(organizationId)}/invitations${query({ cursor })}`),
      inviteMember: (organizationId, recipient, role, idempotencyKey) => request(`/organizations/${encodeURIComponent(organizationId)}/member-invitations`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: { recipient, role } }),
      inviteTeam: (organizationId, teamId, idempotencyKey) => request(`/organizations/${encodeURIComponent(organizationId)}/team-invitations`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: { teamId } }),
      respondToInvitation: (invitationId, response, idempotencyKey) => request(`/organization-invitations/${encodeURIComponent(invitationId)}/response`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: { response } }),
      removeTeam: (organizationId, teamId, reason) => request(`/organizations/${encodeURIComponent(organizationId)}/teams/${encodeURIComponent(teamId)}`, { method: 'DELETE', body: { reason } }),
      transferOwnership: (organizationId, memberId, confirmation, idempotencyKey) => request(`/organizations/${encodeURIComponent(organizationId)}/ownership`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: { memberId, confirmation } }),
    },
    profiles: {
      listTeams: (search) => request(`/public/teams${query({ search })}`),
      teamBySlug: (slug) => request(`/public/teams/${encodeURIComponent(slug)}`, { nullStatuses: [404] }),
      matches: (teamId) => request(`/public/teams/${encodeURIComponent(teamId)}/matches`),
      upcomingMatch: (teamId) => request(`/public/teams/${encodeURIComponent(teamId)}/upcoming-match`, { nullStatuses: [404] }),
      seasons: (teamId) => request(`/public/teams/${encodeURIComponent(teamId)}/seasons`),
      mapPerformance: (teamId) => request(`/public/teams/${encodeURIComponent(teamId)}/map-performance`),
      form: (teamId) => request(`/public/teams/${encodeURIComponent(teamId)}/form`),
      mapSpecialization: (teamId) => request(`/public/teams/${encodeURIComponent(teamId)}/map-specialization`),
    },
    publicMatches: {
      schedule: () => request('/matches?status=scheduled'),
      history: () => request('/matches?status=completed'),
      get: (id) => request(`/matches/${encodeURIComponent(id)}`, { nullStatuses: [404] }),
      calendarEvent: (id) => request(`/matches/${encodeURIComponent(id)}/calendar`, { nullStatuses: [404] }),
    },
    search: { public: (value, cursor) => request(`/search${query({ q: value, cursor })}`) },
    players: {
      getBySlug: (slug) => request(`/players/${encodeURIComponent(slug)}`, { nullStatuses: [404] }),
      list: (search, cursor) => request(`/players${query({ search, cursor })}`),
      claim: (playerId, verificationMethod, evidence, idempotencyKey) => request(`/players/${encodeURIComponent(playerId)}/claims`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: { verificationMethod, evidence } }),
      invitations: (cursor) => request(`/me/player-invitations${query({ cursor })}`),
      membershipHistory: (playerId) => request(`/players/${encodeURIComponent(playerId)}/membership-history`),
    },
    archive: { seasons: () => request('/archive') },
    wrapped: {
      forTeam: (teamSlug, period) => request(`/teams/${encodeURIComponent(teamSlug)}/wrapped${query({ year: period.year?.toString(), seasonId: period.seasonId })}`, { nullStatuses: [404] }),
    },
    follows: {
      list: () => request('/me/follows'),
      status: (entityType, entityId) => request(`/me/follows/status${query({ entityType, entityId })}`),
      mutate: (body) => request('/me/follows', { method: 'PUT', body }),
    },
    records: {
      list: () => request('/records'),
      get: (id) => request(`/records/${encodeURIComponent(id)}`, { nullStatuses: [404] }),
      history: (id) => request(`/records/${encodeURIComponent(id)}/history`),
    },
    media: {
      validateBrandAsset: (body) => request('/media/validate', { method: 'POST', body }),
      uploadBrandAsset: (body) => request('/media/uploads', { method: 'POST', body }),
    },
    rooms: { getForEligibleTeam: (tournamentId, roundId) => request(`/team/tournaments/${encodeURIComponent(tournamentId)}/rounds/${encodeURIComponent(roundId)}/room`) },
    results: {
      leaderboard: (tournamentId) => request(`/leaderboards/${encodeURIComponent(tournamentId)}`),
      snapshots: (tournamentId) => request(`/leaderboards/${encodeURIComponent(tournamentId)}/snapshots`),
      movement: (tournamentId) => request(`/leaderboards/${encodeURIComponent(tournamentId)}/movement`),
      saveRound: (body) => request('/admin/results', { method: 'POST', body }),
      versions: (resultId) => request(`/admin/results/${encodeURIComponent(resultId)}/versions`),
      correct: (resultId, result, reason, expectedVersion, idempotencyKey) => request(`/admin/results/${encodeURIComponent(resultId)}/corrections`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: { result, reason, expectedVersion } }),
    },
    notifications: {
      inbox: () => request('/me/notifications'),
      messages: () => request('/me/messages'),
      preferences: () => request('/me/notification-preferences'),
      updatePreferences: (body) => request('/me/notification-preferences', { method: 'PUT', body }),
      markRead: (id) => request(`/me/notifications/${encodeURIComponent(id)}/read`, { method: 'PUT' }),
      markAllRead: () => request('/me/notifications/read-all', { method: 'PUT' }),
      page: (cursor) => request(`/me/notifications${query({ cursor })}`),
    },
    rosterRequests: {
      list: (teamId) => request(`/roster-requests${query({ teamId })}`),
      get: (id) => request(`/roster-requests/${encodeURIComponent(id)}`, { nullStatuses: [404] }),
      submit: (body) => request('/roster-requests', { method: 'POST', body }),
      review: (id, status, note) => request(`/admin/roster-requests/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status, note } }),
    },
    disputes: {
      list: (teamId) => request(`/disputes${query({ teamId })}`),
      get: (id) => request(`/disputes/${encodeURIComponent(id)}`, { nullStatuses: [404] }),
      submit: (body) => request('/disputes', { method: 'POST', body }),
      review: (id, status, note) => request(`/admin/disputes/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status, note } }),
    },
    support: {
      listTickets: () => request('/me/support/tickets'),
      getTicket: (id) => request(`/me/support/tickets/${encodeURIComponent(id)}`, { nullStatuses: [404] }),
      createTicket: (body) => request('/me/support/tickets', { method: 'POST', body }),
      page: (cursor, status) => request(`/me/support/tickets${query({ cursor, status })}`),
      reply: (ticketId, body) => request(`/me/support/tickets/${encodeURIComponent(ticketId)}/messages`, { method: 'POST', body }),
      changeStatus: (ticketId, status, reason) => request(`/admin/support/tickets/${encodeURIComponent(ticketId)}/status`, { method: 'PATCH', body: { status, reason } }),
      adminPage: (cursor, status) => request(`/admin/support/tickets${query({ cursor, status })}`),
    },
    operations: {
      audit: () => request('/admin/audit'),
      adminUsers: () => request('/admin/users'),
      player: (playerId) => request(`/admin/players/${encodeURIComponent(playerId)}`, { nullStatuses: [404] }),
    },
    verifications: {
      forEntity: (entityType, entityId) => request(`/verifications/entity${query({ entityType, entityId })}`, { nullStatuses: [404] }),
      get: (id) => request(`/admin/verifications/${encodeURIComponent(id)}`, { nullStatuses: [404] }),
      apply: (body, idempotencyKey) => request('/verifications', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body }),
      page: (status, cursor) => request(`/admin/verifications${query({ status, cursor })}`),
      review: (id, status, reason, expectedStatus) => request(`/admin/verifications/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status, reason, expectedStatus } }),
    },
    admin: {
      blacklist: () => request('/admin/blacklist'),
      ban: (teamId, reason, expiresAt) => request('/admin/blacklist', { method: 'POST', body: { teamId, reason, expiresAt } }),
      sendMessage: (body) => request('/admin/messages', { method: 'POST', body }),
    },
  };
}
