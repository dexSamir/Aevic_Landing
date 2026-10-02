import {describe,it,expect} from 'vitest';
import {teamAnalytics} from '../src/utils/teamAnalytics';
import type {MatchHistoryEntry} from '../src/types/domain';
const match=(id:string,playedAt:string,finishes:number,map='Erangel',placement=1):MatchHistoryEntry=>({id,playedAt,finishes,map,placement,points:finishes+10,tournamentId:'cup',tournamentName:'Cup',stage:'final',stageLabel:'Final',wwcd:placement===1});
describe('published match analytics',()=>{
 it('uses the Baku month boundary and weights map means by match count',()=>{
  const data=teamAnalytics([match('1','2026-09-30T20:30:00Z',6),match('2','2026-10-01T10:00:00Z',2),match('3','2026-09-30T19:30:00Z',1,'Miramar',4)],new Date('2026-10-02T12:00:00Z'));
  expect(data.monthlyKills).toBe(8);expect(data.monthly).toHaveLength(2);expect(data.maps[0]).toMatchObject({map:'Erangel',matches:2,averageKills:4});expect(data.wins).toBe(2);
 });
 it('does not fabricate metrics for missing results or modify the source order',()=>{
  expect(teamAnalytics([]).averagePlacement).toBeUndefined();
  const rows=[match('2','2026-10-02T10:00:00Z',2),match('1','2026-10-01T10:00:00Z',0)];teamAnalytics(rows);expect(rows[0].id).toBe('2');
 });
});
