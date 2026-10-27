import { describe, expect, it } from 'vitest';
import { internationalFormula as formula, rankPublishedResults, scoreMatch } from '../src/utils/scoring';
import type { RoundResult } from '../src/types/domain';
import { regulationSections } from '../src/content/regulations';
import { readFileSync } from 'node:fs';
const row = (teamId: string, changes: Partial<RoundResult> = {}): RoundResult => ({ id: teamId, teamId, roundId: 'm1', tournamentId: 'cup', placement: 2, finishes: 4, placementPoints: 6, finishPoints: 4, penalties: 0, totalPoints: 10, published: true, ...changes });
const rank = (rows: RoundResult[], international = true) => rankPublishedResults(rows, international ? { cup: formula } : {}, ['m1', 'm2']);
describe('international PUBG Mobile preset', () => {
 it('scores all 16 placements with zero and multiple eliminations', () => {
  [10,6,5,4,3,2,1,1,0,0,0,0,0,0,0,0].forEach((points,index) => {
   expect(scoreMatch(formula,index+1,0).totalPoints).toBe(points);
   expect(scoreMatch(formula,index+1,7).totalPoints).toBe(points+7);
  });
  expect(scoreMatch(formula,2,7,2).totalPoints).toBe(11);
 });
 it('orders total points then WWCD then placement then eliminations', () => {
  expect(rank([row('a'),row('b',{totalPoints:11})])[0].teamId).toBe('b');
  expect(rank([row('a'),row('b',{placement:1})])[0].teamId).toBe('b');
  expect(rank([row('a'),row('b',{placementPoints:7,finishPoints:3})])[0].teamId).toBe('b');
  expect(rank([row('a'),row('b',{finishPoints:5,penalties:1})])[0].teamId).toBe('b');
 });
 it('uses the latest relevant match, not the best historical placement or input order', () => {
  const rows=[row('a',{placement:2}),row('b',{placement:3}),row('a',{roundId:'m2',placement:4}),row('b',{roundId:'m2',placement:2})];
  expect(rank(rows)[0].teamId).toBe('b');expect(rank([...rows].reverse())[0].teamId).toBe('b');
  expect(rank([row('b'),row('a')]).map(r=>r.teamId)).toEqual(['a','b']);
 });
 it('aggregates published stored values without recalculating historical scores', () => {
  const rows=[row('a',{placement:1,totalPoints:30}),row('a',{roundId:'m2',placement:1,totalPoints:20}),row('b',{totalPoints:200,published:false})];
  expect(rank(rows)).toHaveLength(1);expect(rank(rows)[0]).toMatchObject({totalPoints:50,matches:2,wwcd:2});
  expect(rank([row('a'),row('b',{placementPoints:5,finishes:5,finishPoints:5})],false)[0].teamId).toBe('b');
  expect(rank([row('a'),row('b',{placementPoints:5,finishes:5,finishPoints:5})])[0].teamId).toBe('a');
 });
 it('keeps the database default identical to the canonical preset, without rewriting rows', () => {
  const migration=readFileSync('supabase/migrations/20261027083043_international_scoring_default.sql','utf8');
  expect(JSON.parse(migration.match(/default '(.*)'::jsonb/)![1])).toEqual(formula);
  expect(migration).not.toMatch(/\bupdate\s+aevic/i);
 });
 it('covers A–N and derives rulebook scoring from the same preset', () => {
  expect(regulationSections).toHaveLength(14);
  expect(regulationSections.map(s=>s.letter).join('')).toBe('ABCDEFGHIJKLMN');
  expect(regulationSections[8].subsections.map(s=>s.body).join(' ')).toContain('2-ci yer — 6');
 });
});
