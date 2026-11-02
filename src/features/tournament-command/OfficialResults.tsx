import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, TeamLogo } from '../../components/common/primitives';
import { services } from '../../services';
import { invalidateQuery, usePlatformQuery } from '../../services/queryCache';
import type { TeamCompetitionContext } from '../../utils/teamCompetitionContext';
import type { TeamPlatformSnapshot } from '../../types/domain';
import { tournamentMatches } from '../../utils/tournamentMatches';
import { eventTime, stageLabels } from './model';

export function OfficialResults({ context, data }: { context: TeamCompetitionContext; data: TeamPlatformSnapshot }) {
  const id = context.tournament.id;
  const standings = usePlatformQuery({ key: `tournament:${id}:leaderboard`, scope: 'public', query: signal => services.results.leaderboard(id, signal) });
  const snapshots = usePlatformQuery({ key: `tournament:${id}:snapshots`, scope: 'public', query: signal => services.results.snapshots(id, signal), retry: 0 });
  const movement = usePlatformQuery({ key: `tournament:${id}:movement`, scope: 'public', query: signal => services.results.movement(id, signal), retry: 0 });
  const [online, setOnline] = useState(navigator.onLine);
  const [allRounds, setAllRounds] = useState(false);
  useEffect(() => {
    const status = () => setOnline(navigator.onLine);
    const refresh = () => { if (navigator.onLine && !document.hidden) { standings.refetch(); snapshots.refetch(); movement.refetch(); } };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('online', status); window.addEventListener('offline', status);
    return () => { clearInterval(timer); window.removeEventListener('online', status); window.removeEventListener('offline', status); };
  }, [standings.refetch, snapshots.refetch, movement.refetch]);
  const rows = (standings.data ?? []).filter(r => r.tournamentId === id).sort((a, b) => a.placement - b.placement);
  const officialSnapshots = (snapshots.data ?? []).filter(s => s.tournamentId === id);
  const publishedAt = [...officialSnapshots].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))[0]?.publishedAt;
  const ours = rows.find(r => r.teamId === data.currentTeam.id);
  const history = context.history;
  const eventRounds = tournamentMatches(id, context.matches, history);
  const rounds = allRounds ? eventRounds : [...eventRounds].reverse().filter(m => history.some(h => h.id === m.id)).slice(0, 5);
  const refresh = () => { standings.refetch(); snapshots.refetch(); movement.refetch(); invalidateQuery('snapshot:team'); };
  return <>
    <section id="standings" tabIndex={-1} className="command-section" aria-labelledby="command-standings-title">
      <header className="command-section-heading"><div><span className="command-eyebrow">RƏSMİ LEADERBOARD</span><h2 id="command-standings-title">Turnir sıralaması</h2></div><Button variant="secondary" onClick={refresh} disabled={standings.loading || standings.refreshing || standings.retryAfterSeconds > 0}>Sıralamanı yenilə</Button></header>
      <p className="command-muted">{rows.length ? `${Math.max(...rows.map(r => r.matches))} dərc edilmiş raund` : standings.data ? 'Dərc edilmiş raund yoxdur' : 'Dərc məlumatı əlçatan deyil'}{publishedAt ? ` · Son rəsmi yenilənmə: ${eventTime(publishedAt)}` : ' · Yenilənmə vaxtı əlçatan deyil'}</p>
      <p className="command-muted">Yalnız dərc edilmiş rəsmi xallar. Matçdaxili canlı statistika deyil.</p>
      {(!online || standings.error) && <p role="status">{!online ? 'İnternet bağlantısı yoxdur.' : 'Yenilənmə alınmadı.'} Son yüklənmiş nəticələr köhnəlmiş ola bilər.</p>}
      {standings.refreshing && <p role="status">Sıralama yenilənir…</p>}
      {standings.loading ? <p role="status">Sıralama yüklənir…</p> : !rows.length ? <p>{standings.error || !standings.data ? 'Sıralama yüklənmədi. Yenidən yoxlayın.' : 'Rəsmi sıralama hələ dərc edilməyib.'}</p> : <>
        {ours && <p className="command-standing-summary">Komandanız <strong>#{ours.placement > 0 ? ours.placement : '—'}</strong> · <strong>{ours.totalPoints} xal</strong> · {ours.matches} matç · {ours.wwcd} WWCD</p>}
        <ol className="command-standings" aria-label="Rəsmi komanda sıralaması">{rows.map(row => {
          const own = row.teamId === data.currentTeam.id;
          const team = own ? data.currentTeam : data.publicTeams?.find(t => t.id === row.teamId);
          const delta = movement.error ? undefined : movement.data?.find(m => m.teamId === row.teamId && m.currentRank === row.placement);
          return <li key={row.teamId} className={own ? 'is-own-team' : ''}>
            <span className="command-rank">{row.placement > 0 ? `#${row.placement}` : '—'}{delta?.previousSnapshotId && delta.delta !== undefined && delta.delta !== 0 && <small aria-label="Sıralama dəyişikliyi">{delta.delta > 0 ? '+' : ''}{delta.delta}</small>}</span>
            <div className="command-team"><TeamLogo name={team?.name ?? 'Komanda'} src={team?.logoUrl} size="sm" /><span><strong>{team?.name ?? 'Komanda adı dərc edilməyib'}</strong>{own && <small>Komandanız</small>}</span></div>
            <dl>{[['Xal', row.totalPoints], ['Kill', row.finishes], ['WWCD', row.wwcd], ['Matç', row.matches], ['Yer xalı', row.placementPoints], ['Kill xalı', row.finishPoints], ['Cərimə', row.penalties]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          </li>;
        })}</ol>
      </>}
    </section>
    <section id="results" tabIndex={-1} className="command-section" aria-labelledby="command-results-title">
      <header className="command-section-heading"><div><span className="command-eyebrow">XƏRİTƏ ÜZRƏ</span><h2 id="command-results-title">Komandanızın nəticələri</h2></div><Button variant="secondary" aria-pressed={allRounds} onClick={() => setAllRounds(v => !v)}>{allRounds ? 'Son 5 nəticə' : 'Bütün raundlar'}</Button></header>
      <p className="command-muted">{allRounds ? 'Bütün raundlar · xronoloji sıra' : 'Son 5 dərc edilmiş matç · yenidən köhnəyə'}</p>
      {!rounds.length && <p>Hələ dərc edilməyib. Planlaşdırılmış raundlara “Bütün raundlar” bölməsində baxın.</p>}
      <ol className="command-results">{rounds.map(match => {
        const result = history.find(h => h.id === match.id);
        const scheduled = context.matches.find(m => m.id === match.id);
        return <li key={match.id}><div><h3>{match.map}{match.round ? ` · Raund ${match.round}` : ''}</h3><p className="command-muted">{scheduled ? `${stageLabels[scheduled.stage]} · Gün ${scheduled.day} · ` : result?.stageLabel ? `${result.stageLabel} · ` : ''}{eventTime(match.date)}</p></div>
          <p>{result ? result.correctedAt ? `Düzəliş edilib · ${eventTime(result.correctedAt)}` : 'Rəsmi nəticə' : scheduled?.publishedAt ? 'Komandanın nəticəsi dərc edilməyib' : match.status === 'live' ? 'CANLI · Nəticə gözlənilir' : match.status === 'completed' ? 'Matç bitib · Dərc gözlənilir' : 'Planlaşdırılıb'}</p>
          {result && <><dl className="command-result-metrics">{[['Yer', result.placement > 0 ? `#${result.placement}` : '—'], ['Kill', result.finishes], ['Yer xalı', result.placementPoints ?? 'Hələ dərc edilməyib'], ['Kill xalı', result.killPoints ?? 'Hələ dərc edilməyib'], ['Cərimə', result.penalties ?? 'Hələ dərc edilməyib'], ['Xal', result.points], ['WWCD', result.wwcd ? 'Bəli' : 'Xeyr']].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><Link to={`/matches/${match.id}`}>Rəsmi matç nəticələri</Link>{result.disputeDeadlineAt && Date.parse(result.disputeDeadlineAt) > Date.now() && <Link to="/team/disputes/new">Nəticəyə etiraz et</Link>}</>}
        </li>;
      })}</ol>
      <div className="command-links"><Link to={`/tournaments/${id}#results`}>Bütün rəsmi nəticələr</Link>{history.length > 0 && <Link to="/team/sharecards">Share Studio</Link>}{context.tournament.status === 'completed' && <Link to={`/tournaments/${id}/recap`}>Turnirin yekunu</Link>}</div>
    </section>
  </>;
}
