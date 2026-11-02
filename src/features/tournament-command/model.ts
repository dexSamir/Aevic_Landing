import type { MatchScheduleItem, Tournament, RegistrationStatus, TournamentStage } from '../../types/domain';

export const stageLabels: Record<TournamentStage, string> = { qualifier: 'Təsnifat', group: 'Qrup mərhələsi', semifinal: 'Yarımfinal', final: 'Final' };
export const participationLabels: Record<RegistrationStatus, string> = { 'not-joined': 'İştirak qeydi yoxdur', pending: 'Təsdiq gözlənilir', confirmed: 'İştirak təsdiqlənib', waitlisted: 'Gözləmə siyahısı', rejected: 'Müraciət qəbul edilməyib', withdrawn: 'İştirak dayandırılıb' };
export const eventTime = (value?: string) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Baku' }) : 'Vaxt paylaşılmayıb';

/** Status is authoritative. An overdue scheduled round must not silently disappear. */
export function commandMatch(matches: readonly MatchScheduleItem[], tournament: Tournament) {
  if (['completed', 'cancelled', 'draft'].includes(tournament.status)) return undefined;
  return matches.filter(m => m.tournamentId === tournament.id && m.status !== 'completed')
    .sort((a, b) => Number(b.status === 'live') - Number(a.status === 'live') || (Date.parse(a.startsAt) || Infinity) - (Date.parse(b.startsAt) || Infinity) || a.round - b.round)[0];
}
export function matchClock(match: MatchScheduleItem, now: number) {
  if (match.status === 'live') return 'CANLI';
  if (match.status === 'completed') return 'Matç bitib';
  const time = Date.parse(match.startsAt);
  if (!Number.isFinite(time)) return 'Vaxt paylaşılmayıb';
  if (now >= time) return 'Başlama vaxtı çatıb · Status gözlənilir';
  const seconds = Math.ceil((time - now) / 1000);
  const days = Math.floor(seconds / 86400), hours = Math.floor(seconds % 86400 / 3600), minutes = Math.floor(seconds % 3600 / 60);
  return `${days ? `${days} gün ` : ''}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
export function configuredStages(matches: readonly MatchScheduleItem[]) {
  const ordered = [...matches].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  return [...new Set(ordered.map(m => m.stage))].map(stage => ({ stage, matches: ordered.filter(m => m.stage === stage) }));
}

const savedRuleLabels: Record<string, string> = { 'Most WWCD': 'Ən çox WWCD', 'Most finish points': 'Ən çox eliminasiya xalı', 'Best final-round placement': 'Son raundda daha yaxşı yer' };
export const scoringRuleLabel = (rule: string) => savedRuleLabels[rule] ?? rule;
