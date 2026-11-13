import {it,expect,vi,afterEach} from 'vitest';
import deliverEmail from '../../netlify/functions/communication-delivery';
import deliverReminders from '../../netlify/functions/tournament-reminders';
import {processCommunicationEmail} from '../../server/platform/communication-email';
import {processTournamentTimers} from '../../server/platform/automatic-communications';
import type {Sql} from 'postgres';
import type {ServerConfig} from '../../server/config';
afterEach(()=>vi.unstubAllEnvs());
it('exits both scheduled functions before configuration or database access by default',async()=>{
 vi.stubEnv('AEVIC_AUTOMATIC_COMMUNICATIONS_ENABLED','');
 vi.stubEnv('SUPABASE_URL','invalid');
 await expect(deliverEmail()).resolves.toBeUndefined();
 await expect(deliverReminders()).resolves.toBeUndefined();
});
it('never activates a preview worker using production credentials',async()=>{
 vi.stubEnv('AEVIC_AUTOMATIC_COMMUNICATIONS_ENABLED','true');
 vi.stubEnv('CONTEXT','deploy-preview');
 await expect(deliverEmail()).resolves.toBeUndefined();
 await expect(deliverReminders()).resolves.toBeUndefined();
});
it('does not read or mutate any jobs or send mail when the application gate is off',async()=>{
 const sql=vi.fn() as unknown as Sql,send=vi.fn();
 await processCommunicationEmail(sql,{} as ServerConfig,send);
 expect(await processTournamentTimers(sql)).toBe(0);
 expect(sql).not.toHaveBeenCalled();expect(send).not.toHaveBeenCalled();
});
it('does not process jobs with the application gate on and database gate off',async()=>{
 const sql=vi.fn().mockResolvedValue([{since:null}]) as unknown as Sql,send=vi.fn();
 await processCommunicationEmail(sql,{automaticCommunicationsEnabled:true} as ServerConfig,send);
 expect(await processTournamentTimers(sql,true)).toBe(0);
 expect(sql).toHaveBeenCalledTimes(2);expect(send).not.toHaveBeenCalled();
});
