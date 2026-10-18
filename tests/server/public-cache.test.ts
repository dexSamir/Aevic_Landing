import {afterEach, expect, it, vi} from 'vitest';
import {publicRead, invalidatePublicReads} from '../../server/platform/public-cache';
afterEach(()=>vi.useRealTimers());
it('coalesces concurrent public reads, reuses success and expires after 30 seconds', async()=>{
 vi.useFakeTimers();const pool={},read=vi.fn(async()=>({name:'public'}));
 const [a,b]=await Promise.all([publicRead(pool,'profile:1',read),publicRead(pool,'profile:1',read)]);
 expect(a).toBe(b);expect(read).toHaveBeenCalledTimes(1);
 await publicRead(pool,'profile:1',read);expect(read).toHaveBeenCalledTimes(1);
 vi.advanceTimersByTime(30001);await publicRead(pool,'profile:1',read);expect(read).toHaveBeenCalledTimes(2);
});
it('invalidates the affected family without evicting unrelated tournaments',async()=>{
 const pool={},profile=vi.fn(async()=>1),tournament=vi.fn(async()=>2);
 await publicRead(pool,'profile:1',profile);await publicRead(pool,'tournaments',tournament);
 invalidatePublicReads(pool,'profile:');await publicRead(pool,'profile:1',profile);await publicRead(pool,'tournaments',tournament);
 expect(profile).toHaveBeenCalledTimes(2);expect(tournament).toHaveBeenCalledTimes(1);
});
it('does not retain errors or let an invalidated pending read overwrite a new value',async()=>{
 const pool={},fail=vi.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValue(2);
 await expect(publicRead(pool,'profile:1',fail)).rejects.toThrow();expect(await publicRead(pool,'profile:1',fail)).toBe(2);
 let resolve!:(n:number)=>void;const pending=publicRead(pool,'profile:2',()=>new Promise<number>(r=>{resolve=r;}));await Promise.resolve();
 invalidatePublicReads(pool,'profile:');await publicRead(pool,'profile:2',async()=>3);resolve(1);await pending;
 expect(await publicRead(pool,'profile:2',async()=>4)).toBe(3);
});
