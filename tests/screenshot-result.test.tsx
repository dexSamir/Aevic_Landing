import { expect, it } from 'vitest';
import { screenshotResult } from '../src/utils/screenshotResult';

it('reads team placement and zero eliminations without importing points or individual kills', () => {
  expect(screenshotResult('#4/16\nTeam Eliminations 0\nKills 8\nTotal Points 90')).toEqual({ placement: '4', kills: '0' });
});

it('leaves ambiguous or unsupported values empty for the reviewer', () => {
  expect(screenshotResult('Rank 2\nRank 5\nKills 12\nTotal Points 20')).toEqual({ placement: '', kills: '' });
  expect(screenshotResult('Placement 101\nTotal Kills 401')).toEqual({ placement: '', kills: '' });
});

import { matchParticipant, tablePanels, panelRows, type OcrWord } from '../src/utils/roundScreenshot';
import { draftRow, mergeScreenshot, validateRoundDraft } from '../src/utils/roundResultDraft';

const participants = [{id:'1',name:'Burmese Ghouls',tag:'BG'},{id:'2',name:'North Flame',tag:'NF'}];
const detected = { name: '| BG', placement:'1', kills:'0', uncertain:false };
it('merges overlapping evidence without summing kills or silently resolving conflicts', () => {
  const first = mergeScreenshot([], [detected], 'first', participants);
  const second = mergeScreenshot(first, [{ ...detected, placement: '' }], 'second', participants);
  expect(second).toHaveLength(1);
  expect(second[0]).toMatchObject({teamId:'1', placement:'1', kills:'0', sources:['first','second']});
  const conflict = mergeScreenshot(second, [{...detected,kills:'4'}], 'third', participants);
  const check = validateRoundDraft(conflict,participants);
  expect(check.valid).toBe(false);
  expect(check.missing.map(t=>t.id)).toEqual(['2']);
  expect(check.issues.get(conflict[0].id)).toContain('Komanda təkrarlanır');
  expect(check.issues.get(conflict[1].id)).toContain('Yerləşmə təkrarlanır');
  expect(validateRoundDraft([...second,draftRow('2','2','15')], participants).valid).toBe(true);
});
it('retains same-image duplicates, unmatched names and manual edits', () => {
  expect(mergeScreenshot([], [detected, detected], 'first', participants)).toHaveLength(2);
  expect(matchParticipant('BGX', participants)).toBe('');
  expect(matchParticipant('North Flame Academy', participants)).toBe('');
  expect(matchParticipant('BG NF', participants)).toBe('');
  expect(matchParticipant('North Flame', participants)).toBe('2');
  const manual = draftRow('1','2','8');
  expect(mergeScreenshot([manual],[detected],'first',participants)[0]).toEqual(manual);
});
it('keeps points rankings and low-confidence numbers out of placement drafts', () => {
  const word=(text:string,x:number,y:number,confidence=95):OcrWord=>({text,x0:x,x1:x+text.length*8,y0:y,y1:y+14,confidence});
  const words=[word('RANK',0,10),word('TEAM',90,10),word('PLACE',205,10),word('PTS',251,10),word('ELIMS',320,10),word('TOTAL',420,10),word('PTS',470,10),
    word('#1',0,50),word('BG',90,50),word('10',205,50),word('7',320,50,32),word('17',420,50)];
  const [panel]=tablePanels(words,550,100);
  expect(panel.pointsRank).toBe(true);
  expect(panelRows(words,panel)).toEqual([{ name:'BG',placement:'',kills:'',uncertain:true }]);
});
