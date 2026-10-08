import {describe,it,expect,vi} from 'vitest';
import {act,fireEvent,render,screen,within} from '@testing-library/react';
import {TeamAnalytics} from '../src/components/team/TeamAnalytics';
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

it('keeps chart units readable when resized and lets touch controls select exact matches',()=>{
 const observers: Array<{ callback: ResizeObserverCallback; target?: Element }> = [];
 class ChartResizeObserver {
  entry: typeof observers[number];
  constructor(callback: ResizeObserverCallback) { this.entry={callback}; observers.push(this.entry); }
  observe(target: Element) { this.entry.target=target; }
  disconnect() {}
 }
 vi.stubGlobal('ResizeObserver',ChartResizeObserver);
 try {
  const rows=[1,2,3,4].map(index=>match(String(index),`2025-08-23T${10+index}:00:00Z`,index));
  render(<TeamAnalytics history={rows}/>);
  act(()=>observers.forEach(({callback,target})=>{if(target) callback([{target,contentRect:{width:256}} as ResizeObserverEntry],{} as ResizeObserver);}));
  const chart=screen.getByRole('group',{name:/Matçlar üzrə kill sayı. X:/});
  expect(chart.getAttribute('viewBox')).toBe('0 0 256 200');
  const article=chart.closest('article')!;
  fireEvent.change(within(article).getByLabelText('Matç seçin'),{target:{value:'1'}});
  expect(within(article).getByText('Matçlar üzrə kill sayı: 1 kill')).toBeInTheDocument();
  expect(within(article).getByLabelText('Matç seçin').closest('[data-export-exclude]')).not.toBeNull();
 } finally { vi.unstubAllGlobals(); }
});
