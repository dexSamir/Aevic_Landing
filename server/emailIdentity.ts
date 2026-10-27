import type { ServerConfig } from './config';
/** Shared server-only sender identity; credentials are independent of From. */
export function emailIdentity(config: Pick<ServerConfig, 'emailFrom' | 'emailFromName' | 'emailReplyTo'>) {
  const from = config.emailFromName
    ? `${JSON.stringify(config.emailFromName)} <${config.emailFrom}>`
    : config.emailFrom ?? '';
  return { from, ...(config.emailReplyTo ? { replyTo: config.emailReplyTo } : {}) };
}
