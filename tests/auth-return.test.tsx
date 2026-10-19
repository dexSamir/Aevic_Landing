import { expect, it } from 'vitest';
import { safeAuthReturn, authorizedAuthReturn } from '../src/utils/authReturn';
it('preserves application return paths and prevents open redirects or auth loops', () => {
 for (const path of ['https://evil.test','//evil.test','/\\evil.test','/%2f%2fevil.test','/login','/api/auth/google/callback','/team/../../login','/team%0a']) expect(safeAuthReturn(path)).toBeUndefined();
 expect(safeAuthReturn('/tournaments/one?tab=results#table')).toBe('/tournaments/one?tab=results#table');
 expect(authorizedAuthReturn('/team/roster', true)).toBe('/team/roster');
 expect(authorizedAuthReturn('/team/roster', false)).toBe('/account');
 expect(authorizedAuthReturn('/%74eam/roster', false)).toBe('/account');
});
