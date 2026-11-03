import { ArrowRight, BarChart3, Crosshair, Layers, Map, Target, Trophy } from 'lucide-react';
import { mapArtwork } from '../../assets/maps';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Modal } from '../../components/common/primitives';
import { services } from '../../services';
import { invalidateQuery, usePlatformQuery } from '../../services/queryCache';
import type { TeamCompetitionContext } from '../../utils/teamCompetitionContext';
import type { TeamPlatformSnapshot } from '../../types/domain';
import { tournamentMatches } from '../../utils/tournamentMatches';
import { StandingsTable, standingsWindow } from './StandingsTable';
import { CommandPanelSkeleton } from './TournamentCommandSkeleton';

export function OfficialResults({ context, data }: { context: TeamCompetitionContext; data: TeamPlatformSnapshot }) {
  const id = context.tournament.id;
  const standings = usePlatformQuery({ key: `tournament:${id}:leaderboard`, scope: 'public', query: signal => services.results.leaderboard(id, signal) });
  const snapshots = usePlatformQuery({ key: `tournament:${id}:snapshots`, scope: 'public', query: signal => services.results.snapshots(id, signal), retry: 0 });
  const movement = usePlatformQuery({ key: `tournament:${id}:movement`, scope: 'public', query: signal => services.results.movement(id, signal), retry: 0 });
  const [online, setOnline] = useState(navigator.onLine);
  const [fullStandings, setFullStandings] = useState(false);
  const [allRounds, setAllRounds] = useState(false);
  useEffect(() => {
    const status = () => setOnline(navigator.onLine);
    const placedResults = history.filter(result => result.placement > 0);
  const averagePlacement = placedResults.length ? (placedResults.reduce((sum, result) => sum + result.placement, 0) / placedResults.length).toFixed(1) : '—';
  const refresh = () => { if (navigator.onLine && !document.hidden) { standings.refetch(); snapshots.refetch(); movement.refetch(); } };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('online', status); window.addEventListener('offline', status);
    return () => { clearInterval(timer); window.removeEventListener('online', status); window.removeEventListener('offline', status); };
  }, [standings.refetch, snapshots.refetch, movement.refetch]);
  const rows = (standings.data ?? []).filter(r => r.tournamentId === id).sort((a, b) => a.placement - b.placement);
  const ours = rows.find(r => r.teamId === data.currentTeam.id);
  const history = context.history;
  const eventRounds = tournamentMatches(id, context.matches, history);
  const rounds = allRounds ? eventRounds : [...eventRounds].reverse().filter(m => history.some(h => h.id === m.id)).slice(0, 4);
  const placedResults = history.filter(result => result.placement > 0);
  const averagePlacement = placedResults.length ? (placedResults.reduce((sum, result) => sum + result.placement, 0) / placedResults.length).toFixed(1) : '—';
  const refresh = () => { standings.refetch(); snapshots.refetch(); movement.refetch(); invalidateQuery('snapshot:team'); };
  return <>
    <section id="standings" tabIndex={-1} className="command-section" aria-labelledby="command-standings-title">
      <header className="command-section-heading"><div><h2 id="command-standings-title"><BarChart3 /> Turnir sıralaması</h2></div><div className="command-standing-actions"><Button variant="ghost" onClick={() => setFullStandings(true)} disabled={!rows.length}>Tam reytinqə bax <ArrowRight size={14} /></Button><Button variant="secondary" onClick={refresh} disabled={standings.loading || standings.refreshing || standings.retryAfterSeconds > 0}>Sıralamanı yenilə</Button></div></header>

      {(!online || standings.error) && <p role="status">{!online ? 'İnternet bağlantısı yoxdur.' : 'Yenilənmə alınmadı.'} Son yüklənmiş nəticələr köhnəlmiş ola bilər.</p>}
      {standings.refreshing && <p role="status">Sıralama yenilənir…</p>}
      {standings.loading ? <CommandPanelSkeleton kind="standings" /> : !rows.length ? <p>{standings.error || !standings.data ? 'Sıralama yüklənmədi. Yenidən yoxlayın.' : 'Rəsmi sıralama hələ dərc edilməyib.'}</p> : <>
        <StandingsTable rows={standingsWindow(rows, data.currentTeam.id)} data={data} movement={movement.error ? [] : movement.data} />
        {!ours && <p className="command-muted">Komandanızın rəsmi sıralaması hələ dərc edilməyib.</p>}

      </>}
    </section>
    <Modal open={fullStandings} title="Tam turnir sıralaması" onClose={() => setFullStandings(false)} className="command-dialog"><p className="command-muted">Yalnız dərc edilmiş rəsmi xallar · {context.tournament.name}</p><StandingsTable rows={rows} data={data} movement={movement.error ? [] : movement.data} full /></Modal>
    <section className="command-section command-performance" aria-labelledby="command-performance-title">
      <h2 id="command-performance-title"><BarChart3 /> Komandanın performansı</h2>
      {standings.loading ? <CommandPanelSkeleton kind="performance" /> : ours ? <><dl className="command-performance-stats">{[['Cari yer', ours.placement > 0 ? `#${ours.placement}` : '—'], ['Ümumi xal', ours.totalPoints], ['Eliminasiya', ours.finishes], ['Orta yer', averagePlacement]].map(([label, value], index) => <div key={label}>{index === 1 ? <Layers size={18} /> : index === 2 ? <Crosshair size={18} /> : index === 3 ? <Target size={18} /> : <Trophy size={18} />}<dd>{value}</dd><dt>{label}</dt></div>)}</dl><h3>Son matçlar</h3><div className="command-recent">{[...history].sort((a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt)).slice(0, 4).map(result => <Link key={result.id} to={`/matches/${result.id}`}><strong>{context.matches.find(match => match.id === result.id)?.round ? `R${context.matches.find(match => match.id === result.id)!.round}` : result.map}</strong><span>#{result.placement || '—'} · {result.points} xal</span></Link>)}</div>{!history.length && <p className="command-muted">Matç nəticələri hələ dərc edilməyib.</p>}</> : <p className="command-muted">Komandanın rəsmi statistikası dərc edildikdən sonra burada görünəcək.</p>}
    </section>
    <section id="results" tabIndex={-1} className="command-section" aria-labelledby="command-results-title">
      <header className="command-section-heading"><div><h2 id="command-results-title"><Map /> Xəritə nəticələri</h2></div><Button variant="secondary" aria-pressed={allRounds} onClick={() => setAllRounds(v => !v)}>{allRounds ? 'Son 4 nəticə' : 'Bütün raundlar'}</Button></header>
      <p className="command-muted">{allRounds ? 'Bütün raundlar · xronoloji sıra' : 'Son 4 dərc edilmiş matç'}</p>
      {!rounds.length && <p>Hələ dərc edilməyib. Planlaşdırılmış raundlara “Bütün raundlar” bölməsində baxın.</p>}
      <ol className="command-results">{rounds.map(match => {
        const result = history.find(h => h.id === match.id);
        return <li key={match.id}>
          <h3>{match.round ? `Raund ${match.round} · ` : ''}{match.map}</h3>
          <p className="command-result-summary"><Trophy size={16} /><strong>{result?.placement ? `#${result.placement}` : '—'}</strong><span>{result ? `${result.points} xal` : 'Nəticə gözlənilir'}</span></p>
          {mapArtwork[match.map.toLowerCase()] && <img className="command-result-art" src={mapArtwork[match.map.toLowerCase()].src} srcSet={mapArtwork[match.map.toLowerCase()].srcSet} sizes="(max-width: 600px) 45vw, 240px" alt="" loading="lazy" />}

        </li>;
      })}</ol>
      <div className="command-links"><Link to={`/tournaments/${id}#results`}>Bütün rəsmi nəticələr</Link>{history.length > 0 && <Link to="/team/sharecards">Share Studio</Link>}{context.tournament.status === 'completed' && <Link to={`/tournaments/${id}/recap`}>Turnirin yekunu</Link>}</div>
    </section>
  </>;
}
