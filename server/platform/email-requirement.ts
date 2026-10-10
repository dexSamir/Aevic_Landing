import type { Sql } from 'postgres';
import { ServiceError } from '../errors';

export async function requireVerifiedEmail(sql: Sql, accountId: string) {
  const [row] = await sql`select a.verification_required,
    coalesce(a.email_verified_at,d.email_verified_at) as verified
    from aevic_platform.accounts a left join aevic_platform.team_details d
    on d.team_id=a.original_team_id where a.id=${accountId}`;
  if (!row) throw new ServiceError(401, 'UNAUTHORIZED');
  if (row.verification_required && !row.verified) throw new ServiceError(403, 'EMAIL_VERIFICATION_REQUIRED');
}
