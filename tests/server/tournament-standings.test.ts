import { expect, it, vi } from 'vitest';
import type { Sql } from 'postgres';
import type { DbClient } from '../../server/db';
import { PlatformRepository } from '../../server/platform/repository';
it('reads only the requested public tournament in one statement and reuses official ranking', async () => {
 const sql=vi.fn().mockResolvedValue([{id:'cup',results:[{id:'result',match_id:'match',tournament_id:'cup',team_id:'16',placement:1,finishes:4,placement_points:10,finish_points:4,penalties:0,total_points:14,published:true}]}]);
 const repo=new PlatformRepository({} as DbClient,sql as unknown as Sql);
 expect(await repo.tournamentStandings('cup')).toMatchObject([{teamId:'16',matches:1,totalPoints:14,placement:1}]);
 expect(sql).toHaveBeenCalledTimes(1);
 const [parts,id]=sql.mock.calls[0];
 expect(id).toBe('cup');
 const query=parts.join('?');
 expect(query).toContain("t.status<>'draft'");
 expect(query).toContain('t.archived_at is null');
 expect(query).toContain('m.published_at is not null');
 expect(query).toContain('and r.published');
 expect(query).not.toContain('tournament_registrations');
});
it('distinguishes missing tournaments from a real tournament without published results', async () => {
 const sql=vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{id:'cup',results:[]}]);
 const repo=new PlatformRepository({} as DbClient,sql as unknown as Sql);
 await expect(repo.tournamentStandings('missing')).rejects.toMatchObject({status:404});
 await expect(repo.tournamentStandings('cup')).resolves.toEqual([]);
});
