export type OcrWord = { text: string; confidence: number; x0: number; x1: number; y0: number; y1: number };
export type DetectedTeam = { name: string; placement: string; kills: string; uncertain: boolean };
export type Participant = { id: string; name: string; tag?: string };
type Column = { kind: 'rank' | 'team' | 'kills' | 'other'; left: number; right: number };
export type TablePanel = { columns: Column[]; top: number; bottom: number; headerHeight: number; pointsRank: boolean };
const cx = (w: OcrWord) => (w.x0 + w.x1) / 2;
const cy = (w: OcrWord) => (w.y0 + w.y1) / 2;
const label = (w?: OcrWord) => (w?.text ?? '').trim().toLowerCase().replace(/[^a-z#]/g, '');

function bands(words: OcrWord[], tolerance: number) {
  const lines: OcrWord[][] = [];
  for (const word of [...words].sort((a, b) => cy(a) - cy(b))) {
    const last = lines[lines.length - 1];
    if (last && cy(word) - cy(last[0]) <= tolerance) last.push(word);
    else lines.push([word]);
  }
  return lines.map(line => line.sort((a, b) => a.x0 - b.x0));
}

type Heading = { kind: 'rank' | 'placement' | 'team' | 'kills' | 'score' | 'aggregate' | 'other'; x0: number; x1: number };

function headingsIn(line: OcrWord[], height: number) {
  const headings: Heading[] = [];
  for (let i = 0; i < line.length; i++) {
    const w = line[i], next = line[i+1];
    let token = label(w), right = w.x1;
    const pair = token + ' ' + label(next);
    if (next && next.x0 - w.x1 < 1.6 * height &&
        /^(?:(?:team|squad) (?:name|no|number|#)|(?:total|team) (?:kills|elims|eliminations|finishes|damage)|(?:total|place|placement|kills?|eliminations?) (?:pts|points)|survival (?:rank|placement))$/.test(pair)) {
      token = pair.replace(' ',''); right = next.x1; i++;
    }
    let kind: Heading['kind'] = 'other';
    if (/^(?:team|teams|teamname|squad|squadname|teamno|teamnumber|team#)$/.test(token)) kind = 'team';
    else if (/^(rank|ranking|#)$/.test(token)) kind = 'rank';
    else if (/^(place|position|pos|placement|survivalplacement|survivalrank)$/.test(token)) kind = 'placement';
    else if (/^(?:(?:team|total)?(?:kills|finishes|elims|eliminations)|elms)$/.test(token)) kind = 'kills';
    else if (/pts$|points$|^(total|score)$/.test(token)) kind = 'score';
    else if (/^(wwcd|matches|played|games|player|players|ign)$/.test(token)) kind = 'aggregate';
    if (kind !== 'other' || /^(damage|members|penalty|assists|totaldamage)$/.test(token)) headings.push({kind,x0:w.x0,x1:right});
  }
  return headings;
}

/** Anchor each panel to its printed headings. A points rank is not survival placement. */
export function tablePanels(words: OcrWord[], width: number, height: number): TablePanel[] {
  const panels: TablePanel[] = [];
  const handled = new Set<OcrWord>();
  for (const team of words.filter(w => /^(team|teams|squad|teamname)$/.test(label(w)))) {
    if (handled.has(team)) continue;
    const h = Math.max(5, team.y1-team.y0);
    const line = words.filter(w => Math.abs(cy(w)-cy(team)) < h*0.7).sort((a,b) => a.x0-b.x0);
    line.forEach(w => handled.add(w));
    const groups: Heading[][] = [[]];
    for (const heading of headingsIn(line,h)) {
      let group = groups[groups.length-1];
      if (['team','rank','placement','kills'].includes(heading.kind) && group.some(c => c.kind === heading.kind)
          && group.some(c => c.kind === 'team') && group.some(c => c.kind === 'kills')) {
        group = []; groups.push(group);
      }
      group.push(heading);
    }
    for (const group of groups) {
      const rank = group.find(c => c.kind === 'rank') ?? group.find(c => c.kind === 'placement');
      if (!rank || !group.some(c => c.kind === 'team') || !group.some(c => c.kind === 'kills') || group.some(c => c.kind === 'aggregate')) continue;
      const pointsRank = rank.kind === 'rank' && group.some(c => c.kind === 'score');
      const columns = group.map((c, i): Column => {
        const prev=group[i-1], next=group[i+1];
        return {
          kind: c === rank ? 'rank' : c.kind === 'team' || c.kind === 'kills' ? c.kind : 'other',
          left: prev ? Math.max((prev.x1+c.x0)/2, c.kind === 'team' ? 0 : c.x0-h*1.3) : Math.max(0,c.x0-h*1.5),
          right: next ? Math.max((c.x1+next.x0)/2, next.kind === 'team' ? 0 : next.x0-h*1.3)
            : c.kind === 'team' ? width : Math.min(width,c.x1+h*2.5),
        };
      });
      panels.push({ columns, top:team.y1, bottom:height, headerHeight:h, pointsRank });
    }
  }
  for (const panel of panels) for (const next of panels) {
    if (next.top > panel.top + panel.headerHeight * 2 && Math.abs(next.columns[0].left - panel.columns[0].left) < panel.headerHeight * 2)
      panel.bottom = Math.min(panel.bottom, next.top - next.headerHeight);
  }
  return panels;
}

function numberCell(words: OcrWord[], min: number, max: number) {
  if (words.length !== 1 || words[0].confidence < 55) return '';
  const match = /^#?(\d{1,3})$/.exec(words[0].text.trim());
  return match && +match[1] >= min && +match[1] <= max ? String(+match[1]) : '';
}

export function panelRows(words: OcrWord[], panel: TablePanel, participants: Participant[] = []): DetectedTeam[] {
  const { columns, headerHeight: h } = panel;
  const result: DetectedTeam[] = [];
  const relevant = words.filter(w => cy(w) > panel.top && cy(w) < panel.bottom && columns.some(c => c.kind !== 'other' && cx(w) >= c.left && cx(w) < c.right));
  for (const line of bands(relevant, h * 0.85)) {
    const cell = (kind: Column['kind']) => line.filter(w => columns.some(c => c.kind === kind && cx(w) >= c.left && cx(w) < c.right));
    const rank = cell('rank'), names = cell('team'), eliminations = cell('kills');
    const name = names.map(w => w.text.trim()).join(' ').trim();
    if (!rank.some(w => /\d/.test(w.text)) && !(names.length && eliminations.some(w => /\d/.test(w.text))) &&
        !matchParticipant(name, participants)) continue;
    const placement = panel.pointsRank ? '' : numberCell(rank, 1, 100);
    const kills = numberCell(eliminations, 0, 400);
    result.push({ name, placement, kills, uncertain: !name || !placement || !kills || [...names, ...eliminations, ...rank].some(w => w.confidence < 80) });
  }
  return result;
}

export function matchParticipant(name: string, participants: Participant[]) {
  const norm = (s: string) => s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const text = norm(name);
  const exact = participants.filter(p => text && [p.name,p.tag].some(s => s && norm(s) === text));
  if (exact.length) return exact.length === 1 ? exact[0].id : '';
  // Broadcast logos sometimes OCR as punctuation or letters before the team
  // tag. A substring of an unregistered team name is insufficient evidence.
  const tagged = participants.filter(p => {
    const tag = norm(p.tag ?? '');
    return tag.length >= 2 && (' ' + text + ' ').includes(' ' + tag + ' ');
  });
  return tagged.length === 1 && text.endsWith(' ' + norm(tagged[0].tag!)) ? tagged[0].id : '';
}
