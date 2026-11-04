import { ArrowDown, ArrowUp } from 'lucide-react';
import { TeamLogo } from '../../components/common/primitives';
import type { TeamTournamentResult, RankMovementData, TeamPlatformSnapshot } from '../../types/domain';

/** Keeps five official ranks, filling from the opposite side at ranking boundaries. */
export function standingsWindow<T extends { teamId: string }>(rows: readonly T[], teamId: string): T[] {
  const ownIndex = rows.findIndex(row => row.teamId === teamId);
  if (ownIndex < 0) return rows.slice(0, 5);
  const start = Math.max(0, Math.min(ownIndex - 2, rows.length - 5));
  return rows.slice(start, start + 5);
}

export function StandingsTable({ rows, data, movement = [], full = false }: {
  rows: TeamTournamentResult[]; data: TeamPlatformSnapshot; movement?: RankMovementData[]; full?: boolean;
}) {
  return <div className={`command-table-wrap ${full ? 'command-table-full' : 'command-table-preview'}`}><table className="command-table">
    <caption className="sr-only">{full ? 'Tam turnir sıralaması' : 'Komandanızın ətrafındakı sıralama'}</caption>
    <thead><tr>{['#', 'Komanda', 'Matç', 'WWCD', 'Yer xalı', 'Kill xalı', 'Xal', 'Dəyişiklik', ...(full ? ['Eliminasiya', 'Cərimə'] : [])].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
    <tbody>{rows.map(row => {
      const own = row.teamId === data.currentTeam.id;
      const team = own ? data.currentTeam : data.publicTeams?.find(team => team.id === row.teamId);
      const delta = movement.find(item => item.teamId === row.teamId && item.currentRank === row.placement);
      const change = delta?.previousSnapshotId ? delta.delta : undefined;
      return <tr key={row.teamId} className={own ? 'is-own-team' : undefined}>
        <td className="command-rank"><span className="command-rank-badge">{row.placement > 0 ? row.placement : '—'}</span></td>
        <th scope="row"><span className="command-team"><TeamLogo name={team?.name ?? 'Komanda'} src={team?.logoUrl} size="sm" /><span>{team?.name ?? 'Komanda adı dərc edilməyib'}{own && <small className="sr-only">Komandanız</small>}</span></span></th>
        {([['Matç', row.matches], ['WWCD', row.wwcd], ['Yer xalı', row.placementPoints], ['Kill xalı', row.finishPoints], ['Xal', row.totalPoints]] as const).map(([label, value]) => <td data-label={label} key={label}>{value}</td>)}
        <td data-label="Dəyişiklik"><span className="command-movement" data-direction={change === undefined || change === 0 ? 'none' : change > 0 ? 'up' : 'down'} aria-label={change === undefined ? 'Əvvəlki raund məlumatı yoxdur' : change === 0 ? 'Sıralama dəyişməyib' : `${Math.abs(change)} pillə ${change > 0 ? 'yuxarı' : 'aşağı'}`}>
          {change !== undefined && change !== 0 ? <>{change > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}{Math.abs(change)}</> : '—'}
        </span></td>
        {full && <><td data-label="Eliminasiya">{row.finishes}</td><td data-label="Cərimə">{row.penalties}</td></>}
      </tr>;
    })}</tbody>
  </table></div>;
}
