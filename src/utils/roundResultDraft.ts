import type { RoundResult } from '../types/domain';
import { matchParticipant, type DetectedTeam, type Participant } from './roundScreenshot';

export type DraftRow = DetectedTeam & { id: string; teamId: string; sources: string[] };
export function draftRow(teamId = '', placement = '', kills = ''): DraftRow {
  return { id: crypto.randomUUID(), name: '', teamId, placement, kills, uncertain: false, sources: [] };
}
export function savedDraftRows(saved: RoundResult[]) {
  return saved.map(r => draftRow(r.teamId, String(r.placement), String(r.finishes)));
}

export function mergeScreenshot(rows: DraftRow[], detected: DetectedTeam[], source: string, teams: Participant[]) {
  const merged = [...rows];
  for (const fields of detected) {
    const teamId = matchParticipant(fields.name, teams);
    const candidates = merged.filter(row => teamId && row.teamId === teamId);
    const existing = candidates.length === 1 ? candidates[0] : undefined;
    const compatible = existing && !existing.sources.includes(source)
      && (!existing.placement || !fields.placement || fields.placement === existing.placement)
      && (!existing.kills || !fields.kills || fields.kills === existing.kills);
    if (existing && compatible) {
      merged[merged.indexOf(existing)] = { ...existing, name: existing.name || fields.name,
        placement: existing.placement || fields.placement, kills: existing.kills || fields.kills,
        uncertain: existing.uncertain || fields.uncertain, sources: [...existing.sources, source] };
    } else {
      merged.push({ ...draftRow(teamId), ...fields, sources: [source] });
    }
  }
  return merged;
}

export function validateRoundDraft(rows: DraftRow[], teams: Participant[]) {
  const issues = new Map<string, string[]>();
  const validInteger = (v: string, min: number, max: number) => /^\d+$/.test(v) && +v >= min && +v <= max;
  for (const row of rows) {
    const problems: string[] = [];
    if (!teams.some(t => t.id === row.teamId)) problems.push('Komandanı seçin');
    else if (rows.some(r => r !== row && r.teamId === row.teamId)) problems.push('Komanda təkrarlanır');
    if (!validInteger(row.placement, 1, teams.length)) problems.push(`Yerləşmə 1–${teams.length} aralığında olmalıdır`);
    else if (rows.some(r => r !== row && r.placement && +r.placement === +row.placement)) problems.push('Yerləşmə təkrarlanır');
    if (!validInteger(row.kills, 0, 400)) problems.push('Kill sayını daxil edin');
    if (problems.length) issues.set(row.id, problems);
  }
  const missing = teams.filter(team => !rows.some(row => row.teamId === team.id));
  return { missing, issues, valid: teams.length > 0 && !missing.length && !issues.size };
}
