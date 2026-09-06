import { ApiError, apiErrorFromResponse, networkApiError } from './apiError';

export async function requestJson<T>(url: string, options: RequestInit = {}, nullStatuses: number[] = [], timeoutMs = 10_000): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  if (options.signal?.aborted) cancel();
  else options.signal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (nullStatuses.includes(response.status)) return undefined as T;
    if (!response.ok) throw await apiErrorFromResponse(response);
    if (response.status === 204) return undefined as T;
    const type = response.headers.get('content-type')?.toLowerCase() ?? '';
    if (!type.includes('application/json') && !type.includes('+json')) throw new ApiError({ status: response.status, kind: 'server', code: 'UNEXPECTED_CONTENT_TYPE', message: 'Məlumat servisi etibarsız cavab qaytardı.' });
    try { return await response.json() as T; }
    catch (error) { if (controller.signal.aborted) throw error; throw new ApiError({ status: response.status, kind: 'server', code: 'INVALID_JSON_RESPONSE' }); }
  } catch (error) {
    if (controller.signal.aborted) throw new ApiError({ status: 0, kind: timedOut ? 'timeout' : 'abort' });
    if (error instanceof ApiError) throw error;
    throw networkApiError();
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancel);
  }
}
