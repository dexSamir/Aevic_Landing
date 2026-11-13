import { readConfig } from '../../server/config';
import { PostgresCaptainStore } from '../../server/captain/postgres';
import { processCommunicationEmail } from '../../server/platform/communication-email';

export default async function deliverEmail() {
  if (process.env.AEVIC_AUTOMATIC_COMMUNICATIONS_ENABLED !== 'true' || (process.env.CONTEXT && process.env.CONTEXT !== 'production')) return;
  const config = readConfig();
  if (!config.automaticCommunicationsEnabled) return;
  if (!config.databaseUrl) throw new Error('COMMUNICATION_DATABASE_REQUIRED');
  const { sql } = new PostgresCaptainStore(config.databaseUrl);
  await processCommunicationEmail(sql, config);
}

export const config = { schedule: '*/5 * * * *' };
