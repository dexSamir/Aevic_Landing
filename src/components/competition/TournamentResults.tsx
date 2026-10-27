import { usePublicSession } from '../../services/PublicSessionContext';
import { Download, Trophy, BarChart3 } from 'lucide-react';
import { lazy, Suspense, useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { PublicTeamSummary, TeamTournamentResult } from '../../types/domain';
import type { TournamentMatch } from '../../utils/tournamentMatches';
import { services } from '../../services';
import { queryPolicy, usePlatformQuery } from '../../services/queryCache';
import { DataTable, EmptyState, LoadingSkeleton, SectionHeading, TeamLogo } from '../common/primitives';

const ResultsDownloadModal = lazy(async () => ({ default: (await import('./ResultsDownloadModal')).ResultsDownloadModal }));

type Props = {
  standings: TeamTournamentResult[]; teamNames: string[]; teams: PublicTeamSummary[];
  publishedRoundCount?: number; tournamentName?: string; tournamentId: string; publishedAt?: string;
  matches?: TournamentMatch[]; loading?: boolean; error?: boolean; retry?: () => void; retryAfterSeconds?: number;
  scheduleLoading?: boolean; scheduleError?: boolean; retrySchedule?: () => void;
};

export function TournamentResults({ standings, teams, tournamentName, tournamentId, publishedAt, matches = [], loading, error, retry, retryAfterSeconds = 0, scheduleLoading, scheduleError, retrySchedule }: Props) {
  const { team: ownTeam } = usePublicSession();
  const [params, setParams] = useSearchParams();
  const selected = params.get('match') ?? '';
  const selectedIndex = matches.findIndex(match => match.id === selected);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const closeDownload = useCallback(() => setDownloadOpen(false), []);
  const matchQuery = usePlatformQuery({ scope: 'public', key: `tournament:${tournamentId}:match:${selected}`, query: signal => services.publicMatches.get(selected, signal), enabled: Boolean(selected && selectedIndex >= 0), staleTime: queryPolicy.publicCompetition, retry: 0 });
  const overall = standings.filter(row => row.tournamentId === tournamentId).sort((a, b) => a.placement - b.placement);
  const detail = matchQuery.data?.tournament.id === tournamentId && matchQuery.data.match.id === selected && matchQuery.data.published ? matchQuery.data : undefined;
  const ordered = selected ? (detail?.standings ?? []).filter(row => row.tournamentId === tournamentId).sort((a, b) => a.placement - b.placement) : overall;
  const busy = selected ? scheduleLoading || matchQuery.loading : loading;
  const failed = selected ? Boolean(matchQuery.error) : error;
  const label = selected ? selectedIndex >= 0 ? `Matç ${selectedIndex + 1}` : 'Matç' : 'Ümumi';
  const teamFor = (row: TeamTournamentResult) => {
    const team = teams.find(team => team.id === row.teamId);
    const matchTeam = detail?.teamResults.find(team => team.teamId === row.teamId);
    return { name: team?.name ?? matchTeam?.teamName ?? 'Komanda adı dərc edilməyib', slug: team?.slug ?? matchTeam?.teamSlug, logo: team?.logoUrl ?? matchTeam?.teamLogo };
  };
  const ownRow = (row: TeamTournamentResult) => row.teamId === ownTeam?.id;
  const identity = (row: TeamTournamentResult) => {
    const team = teamFor(row);
    const content = <><TeamLogo name={team.name} src={team.logo} size="sm" /><strong>{team.name}</strong>{ownRow(row) && <small>Komandanız</small>}</>;
    return team.slug ? <Link className="team-cell" to={`/teams/${team.slug}`}>{content}</Link> : <span className="team-cell">{content}</span>;
  };
  const select = (id: string) => setParams(previous => { const next = new URLSearchParams(previous); if (id) next.set('match', id); else next.delete('match'); return next; }, { preventScrollReset: true });
  const tabs = [{ id: '', label: 'Ümumi' }, ...matches.map((match, index) => ({ id: match.id, label: `Matç ${index + 1}` }))];

  return <section id="results" className="tournament-results" aria-labelledby="tournament-results-title">
    <SectionHeading headingId="tournament-results-title" title="Rəsmi nəticələr" description="Yalnız rəsmi olaraq dərc edilmiş nəticələr" action={overall.length ? <button type="button" className="button button--secondary" onClick={() => setDownloadOpen(true)}><Download size={17} aria-hidden="true" />Nəticələri yüklə</button> : undefined} />
    {scheduleError && <p role="alert">Matç siyahısı yüklənmədi. <button type="button" className="button button--secondary" onClick={retrySchedule}>Cədvəli yenilə</button></p>}
    <div className="tournament-result-tabs" role="tablist" aria-label="Nəticə üzrə matç seçimi">{tabs.map((tab, index) => <button key={tab.id} id={`result-tab-${index}`} type="button" role="tab" aria-selected={selected === tab.id} aria-controls="tournament-result-panel" tabIndex={selected === tab.id || (selectedIndex < 0 && index === 0) ? 0 : -1} onClick={() => select(tab.id)} onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      select(tabs[next].id);
      const button = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next];
      button?.focus(); button?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }}>{tab.label}</button>)}</div>
    <div id="tournament-result-panel" role="tabpanel" aria-label={`${label} nəticələri`} tabIndex={0} aria-busy={busy}>
      {busy ? <LoadingSkeleton variant="table" rows={3} /> : failed ? <EmptyState title="Nəticələr yüklənmədi" body="Rəsmi nəticə servisi hazırda cavab vermir." action={<button type="button" className="button button--secondary" disabled={(selected ? matchQuery.retryAfterSeconds : retryAfterSeconds) > 0} onClick={selected ? matchQuery.refetch : retry}>Yenidən cəhd et</button>} /> : ordered.length ? <>
        <p className="tournament-result-context">{label}{selectedIndex >= 0 && ` · ${matches[selectedIndex].map}`} · {ordered.length} komanda</p>
        <div className="tournament-results__summary"><span><Trophy size={18} aria-hidden="true" /><strong>{teamFor(ordered[0]).name}</strong><small>Lider</small></span><span><BarChart3 size={18} aria-hidden="true" /><strong>{Math.max(...ordered.map(row => row.matches))}</strong><small>dərc edilmiş matç</small></span><span><strong>{ordered.reduce((sum, row) => sum + row.wwcd, 0)}</strong><small>ümumi WWCD</small></span></div>
        <DataTable rowClassName={index => ownRow(ordered[index]) ? 'is-own-team' : undefined} caption={`${label} — rəsmi sıralama`} headers={['Yer', 'Komanda', 'Kill', 'WWCD', 'Yer xalı', 'Kill xalı', 'Cərimə', 'Ümumi xal']} rows={ordered.map(result => [<b className="result-rank">#{result.placement}</b>, identity(result), result.finishes, result.wwcd, result.placementPoints, result.finishPoints, result.penalties ? `−${result.penalties}` : '—', <strong>{result.totalPoints}</strong>])} />

      </> : <EmptyState title={selected ? 'Bu matçın nəticələri hələ elan edilməyib.' : 'Ümumi sıralama dərc edilməyib'} body={selected ? 'Yalnız təsdiqlənmiş və dərc edilmiş nəticələr burada görünür.' : 'Dərc edilmiş matçların ümumi sıralaması burada görünəcək.'} />}
    </div>
    {downloadOpen && <Suspense fallback={<p role="status">Yükləmə pəncərəsi açılır…</p>}><ResultsDownloadModal open={downloadOpen} onClose={closeDownload} standings={overall} teams={teams} tournamentId={tournamentId} tournamentName={tournamentName} publishedAt={publishedAt} /></Suspense>}
  </section>;
}
