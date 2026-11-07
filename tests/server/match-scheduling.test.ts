import { it, expect, vi } from 'vitest';
import type { Sql } from 'postgres';
import { createTournament } from '../../server/platform/tournaments';
it.each([0,30,44,-50])('rejects a %s-minute interval before any database write',async(minutes)=>{
 const sql=vi.fn() as unknown as Sql;
 const input={name:'Cup',shortName:'Cup',description:'',startsAt:'2026-12-01T16:00:00Z',endsAt:'2026-12-02T16:00:00Z',registrationOpensAt:'2026-11-30T16:00:00Z',registrationDeadline:'2026-12-01T14:00:00Z',checkInOpensAt:'2026-12-01T14:00:00Z',checkInClosesAt:'2026-12-01T15:00:00Z',maxSlots:20,rules:[],rounds:[{map:'Erangel' as const,startsAt:'2026-12-01T17:00:00Z'},{map:'Rondo' as const,startsAt:new Date(Date.parse('2026-12-01T17:00:00Z')+minutes*60000).toISOString()}]};
 await expect(createTournament(sql,{adminId:'admin'},input)).rejects.toMatchObject({status:422,code:'INVALID_ROUND_SCHEDULE'});expect(sql).not.toHaveBeenCalled();
});
