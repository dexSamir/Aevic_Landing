import type { ContentfulStatusCode } from 'hono/utils/http-status';
export class ServiceError extends Error {
  constructor(public status: ContentfulStatusCode, public code: string, public fieldErrors?: Record<string,string>) { super(code); }
}
export function dbError(error: { code?: string; message?: string } | null): void {
  if (!error) return;
  const known = ['ALREADY_REGISTERED','FULL','REGISTRATION_CLOSED','ROSTER_INCOMPLETE','INELIGIBLE','CHECK_IN_NOT_OPEN','CHECK_IN_CLOSED','DISPUTE_CLOSED','ROSTER_LOCKED','INVALID_STATE','RESULT_VERSION_CONFLICT','EMAIL_NOT_VERIFIED','INVITATION_EXPIRED','INVALID_EVIDENCE','ACTIVE_COMPETITION','TRANSFER_OWNERSHIP_FIRST','DELIVERY_NOT_CONFIGURED','TOURNAMENT_VERSION_CONFLICT','SCHEDULE_LOCKED','CAPACITY_CONFLICT','REGISTRATIONS_EXIST','DUPLICATE_PUBLISHED_PLACEMENT'];
  const code = known.includes(error.message ?? '') ? error.message! : error.code === '23505' ? 'CONFLICT' : error.code === '42501' ? 'FORBIDDEN' : 'INVALID_REQUEST';
  const status = error.code === '42501' ? 403 : ['23505','40001'].includes(error.code??'') ? 409 : error.code === 'P0002' ? 404 : ['22023','23514','23503','22P02','P0001'].includes(error.code ?? '') ? 422 : 503;
  throw new ServiceError(status, status === 503 ? 'DATA_UNAVAILABLE' : code);
}
