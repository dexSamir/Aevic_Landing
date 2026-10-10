import { describe, expect, it, vi } from 'vitest';
import type { Sql } from 'postgres';
import { requireVerifiedEmail } from '../../server/platform/email-requirement';

describe('registration email requirement', () => {
  it.each([{ verification_required: false, verified: null }, { verification_required: true, verified: new Date() }])('preserves existing access and accepts verified accounts', async row => {
    await expect(requireVerifiedEmail(vi.fn(async () => [row]) as unknown as Sql, '2')).resolves.toBeUndefined();
  });
  it('blocks a new unverified account and fails closed for missing identity', async () => {
    await expect(requireVerifiedEmail(vi.fn(async () => [{ verification_required: true, verified: null }]) as unknown as Sql, '99')).rejects.toMatchObject({status:403,code:'EMAIL_VERIFICATION_REQUIRED'});
    await expect(requireVerifiedEmail(vi.fn(async () => []) as unknown as Sql, '99')).rejects.toMatchObject({status:401});
  });
});
