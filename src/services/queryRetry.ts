import { ApiError, safeQueryError } from './apiError';

// Read-query retries only. Mutations never pass through this helper.
export function queryRetryDelay(error: unknown, failure: number, random = Math.random) {
  const safe = safeQueryError(error);
  if (!safe.retryable) return undefined;
  // Long server cooldowns need an explicit later retry, not a long homepage spinner.
  if ((safe.retryAfterMs ?? 0) > 1500) return undefined;
  return Math.max(safe.retryAfterMs ?? 0, Math.min(1200, 300 * 2 ** failure + random() * 300));
}

export async function runReadQuery<T>(query: (signal: AbortSignal) => Promise<T>, signal: AbortSignal, retries = 1): Promise<T> {
  const limit = Math.min(2, Math.max(0, Math.floor(retries)));
  for (let failure = 0; ; failure += 1) {
    if (signal.aborted) throw new ApiError({ status: 0, kind: 'abort' });
    try { return await query(signal); }
    catch (error) {
      const delay = queryRetryDelay(error, failure);
      if (signal.aborted || failure >= limit || delay === undefined) throw error;
      await new Promise<void>((resolve, reject) => {
        const cancel = () => { clearTimeout(timer); reject(new ApiError({ status: 0, kind: 'abort' })); };
        const timer = setTimeout(() => { signal.removeEventListener('abort', cancel); resolve(); }, delay);
        signal.addEventListener('abort', cancel, { once: true });
        if (signal.aborted) cancel();
      });
    }
  }
}
