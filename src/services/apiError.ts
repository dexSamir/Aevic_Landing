export type ApiErrorKind = 'unauthorized' | 'forbidden' | 'not-found' | 'conflict' | 'validation' | 'rate-limit' | 'network' | 'server' | 'timeout' | 'abort' | 'unknown';

export interface ApiErrorDetails {
  status: number;
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
  requestId?: string;
  kind: ApiErrorKind;
  retryAllowed?: boolean;
  retryAfterMs?: number;
}

const defaultMessages: Record<ApiErrorKind, string> = {
  unauthorized: 'Sessiya etibarlı deyil. Yenidən daxil olun.',
  forbidden: 'Bu əməliyyat üçün icazəniz yoxdur.',
  'not-found': 'Soruşulan məlumat tapılmadı.',
  conflict: 'Məlumat başqa dəyişikliklə ziddiyyət təşkil edir.',
  validation: 'Daxil edilən məlumatları yoxlayın.',
  'rate-limit': 'Çox sayda sorğu göndərildi. Bir az sonra yenidən cəhd edin.',
  network: 'Şəbəkə bağlantısı qurulmadı.',
  server: 'Server sorğunu tamamlaya bilmədi.',
  unknown: 'Sorğu tamamlanmadı.',
  timeout: 'Sorğu vaxtında tamamlanmadı. Yenidən yoxlayın.',
  abort: 'Sorğu dayandırıldı.',
};

export function apiErrorKind(status: number): ApiErrorKind {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not-found';
  if (status === 408 || status === 504) return 'timeout';
  if (status === 409) return 'conflict';
  if (status === 400 || status === 422) return 'validation';
  if (status === 429) return 'rate-limit';
  if (status >= 500) return 'server';
  return 'unknown';
}

export class ApiError extends Error implements ApiErrorDetails {
  readonly timestamp = new Date().toISOString();
  get retryable() { return this.retryAllowed !== false && (this.status === 0 || this.status === 408 || this.status === 429 || this.status >= 500) && ['network', 'server', 'timeout', 'rate-limit'].includes(this.kind); }
  status: number;
  code: string;
  fieldErrors?: Record<string, string>;
  requestId?: string;
  kind: ApiErrorKind;
  retryAllowed?: boolean;
  retryAfterMs?: number;

  constructor(details: Partial<ApiErrorDetails> & Pick<ApiErrorDetails, 'status' | 'kind'>) {
    super(details.message ?? defaultMessages[details.kind]);
    this.name = 'ApiError';
    this.status = details.status;
    this.code = details.code ?? details.kind.toUpperCase().replace('-', '_');
    this.fieldErrors = details.fieldErrors;
    this.requestId = details.requestId;
    this.kind = details.kind;
    this.retryAllowed = details.retryAllowed;
    this.retryAfterMs = details.retryAfterMs;
  }
}

interface PublicErrorPayload {
  code?: unknown;
  message?: unknown;
  fieldErrors?: unknown;
  requestId?: unknown;
}

function safeFieldErrors(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const entries = Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string');
  return entries.length ? Object.fromEntries(entries) : undefined;
}

export async function apiErrorFromResponse(response: Response) {
  const kind = apiErrorKind(response.status);
  let payload: PublicErrorPayload = {};
  if (response.headers.get('content-type')?.includes('application/json')) {
    try {
      const value: unknown = await response.json();
      payload = value && typeof value === 'object' && !Array.isArray(value) ? value as PublicErrorPayload : {};
    } catch { payload = {}; }
  }
  return new ApiError({
    status: response.status,
    kind,
    code: typeof payload.code === 'string' && ['ACCOUNT_LOCKED', 'ALREADY_REGISTERED', 'FULL', 'REGISTRATION_CLOSED', 'INELIGIBLE', 'ROSTER_INCOMPLETE', 'PLAYER_CONFLICT', 'UNAUTHORIZED'].includes(payload.code) ? payload.code : undefined,
    // Never display untrusted server messages, stacks, SQL or field values.
    requestId: safeRequestId(payload.requestId) ?? safeRequestId(response.headers.get('x-request-id')),
    retryAllowed: response.headers.get('x-retryable') === 'false' ? false : undefined,
    retryAfterMs: retryAfterMilliseconds(response.headers.get('retry-after')),
  });
}

export function retryAfterMilliseconds(value: string | null, now = Date.now()) {
  if (!value) return undefined;
  const milliseconds = /^\d+(\.\d+)?$/.test(value) ? Number(value) * 1000 : Date.parse(value) - now;
  return Number.isFinite(milliseconds) ? Math.max(0, milliseconds) : undefined;
}

export function networkApiError() {
  return new ApiError({ status: 0, kind: 'network' });
}

export function safeRequestId(value: unknown) {
  return typeof value === 'string' && /^[a-zA-Z0-9_.:-]{1,128}$/.test(value) ? value : undefined;
}

export function safeQueryError(error: unknown) {
  return error instanceof ApiError ? error : networkApiError();
}
