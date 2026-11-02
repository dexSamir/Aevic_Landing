import { expect, it, vi } from 'vitest';
import type { Sql } from 'postgres';
import { room } from '../../server/platform/competition';
const row = { status:'scheduled', tournament_status:'ongoing', room_release_at:new Date('2026-08-04T10:00:00Z'),server_now:new Date('2026-08-04T10:01:00Z'),room_id:'fixture-room',password:'fixture-password' };
it('requires confirmed same-team participation and check-in in the protected query',async()=>{
 const sql=vi.fn().mockResolvedValue([]);
 await expect(room(sql as unknown as Sql,'team','cup','round')).rejects.toMatchObject({status:403});
 const [parts,...values]=sql.mock.calls[0];expect(parts.join('?')).toContain("e.status='confirmed'");expect(parts.join('?')).toContain('c.team_id=e.team_id');expect(parts.join('?')).toContain("team.status='approved'");expect(parts.join('?')).toContain('t.id=');expect(values).toEqual(['team','round','cup']);
});
it.each([
 [{...row,server_now:new Date('2026-08-04T09:59:59Z')},'locked','waiting-release'],
 [{...row,room_id:null},'locked','not-configured'],
 [{...row,password:null},'locked','not-configured'],
 [{...row,room_release_at:null},'locked','not-scheduled'],
 [{...row,status:'completed'},'expired',undefined],
] as const)('never returns credentials for unavailable rooms (%s)',async(value,status,reason)=>{
 const sql=vi.fn().mockResolvedValue([value]);const response=await room(sql as unknown as Sql,'team','cup','round');
 expect(response).toMatchObject({status,...(reason?{reason}:{})});expect(response).not.toHaveProperty('password');expect(response).not.toHaveProperty('roomId');
});
it('releases only the authorized selected round at the exact boundary and denies terminal events',async()=>{
 const sql=vi.fn().mockResolvedValue([{...row,server_now:row.room_release_at}]);
 await expect(room(sql as unknown as Sql,'team','cup','round')).resolves.toMatchObject({roundId:'round',status:'released'});
 for(const tournament_status of ['completed','cancelled']){sql.mockResolvedValue([{...row,tournament_status}]);await expect(room(sql as unknown as Sql,'team','cup','round')).rejects.toMatchObject({status:403});}
});
