import { describe, expect, it } from 'vitest';
import { resolveTeamCardOptions, teamCardLayout } from '../src/utils/teamIdentityCard';
import type { TeamProfileCardData } from '../src/types/domain';

const data = { teamName: 'Azərbaycan Esports', roster: [{ ign: 'Captain', role: 'captain' }], matches: 100, wwcd: 20, championships: 4, podiums: 12, sourceLabel: 'Rəsmi nəticələr', profileUrl: 'https://aevic.gg/teams/test', mapStats: Array.from({length: 5}, (_, i) => ({ map: `Map ${i}`, matches: 10, wwcd: 2, averagePlacement: 3 })), recentMatches: Array.from({length: 5}, (_, i) => ({ id: String(i), playedAt: '2026-10-01', placement: 2, finishes: 10, wwcd: false })) } as TeamProfileCardData;
const base = { template: 'career' as const, showStats: true, showRoster: true, showQr: true, showMaps: true, showRecent: true };

describe('shared card composition', () => {
  it('Standard clears effective optional selections without mutating Extended preferences', () => {
    expect(resolveTeamCardOptions(data, {...base, extended: false})).toMatchObject({showQr:false,showMaps:false,showRecent:false});
    expect(resolveTeamCardOptions(data, {...base, extended: true})).toMatchObject({showQr:true,showMaps:true,showRecent:true});
    expect(resolveTeamCardOptions({...data,mapStats:[],recentMatches:[]}, {...base,extended:true})).toMatchObject({showMaps:false,showRecent:false});
  });
  for (const format of ['square','portrait','story'] as const) for (const extended of [false,true]) for (let mask=0;mask<8;mask++) {
    it(`${format}, extended=${extended}, mask=${mask}: every section precedes the wordmark`, () => {
      const layout=teamCardLayout(data,format,{...base,extended,showQr:!!(mask&1),showMaps:!!(mask&2),showRecent:!!(mask&4)});
      let bottom=0;
      for(const region of layout.regions){expect(region.top).toBeGreaterThanOrEqual(bottom);bottom=region.top+region.height;expect(bottom).toBeLessThanOrEqual(layout.wordmarkTop);}
      expect(layout.wordmarkTop+layout.wordmarkHeight).toBe(layout.height);
      expect(layout.regions.some(r=>r.id==='qr')).toBe(extended&&!!(mask&1));
      expect(layout.regions.some(r=>r.id==='maps')).toBe(extended&&!!(mask&2));
      expect(layout.regions.some(r=>r.id==='recent')).toBe(extended&&!!(mask&4));
    });
  }
});
