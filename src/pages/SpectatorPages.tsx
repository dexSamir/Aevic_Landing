import '../styles/public-pages.css';
import { ArrowRight, Map as MapIcon, RotateCcw, Search, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandJoinCta } from '../components/common/BrandJoinCta';
import { Button, EmptyState, LoadingSkeleton } from '../components/common/primitives';
import { officialAssets } from '../assets/official';
import { competitionNow, serviceCapabilities, services } from '../services';
import type { MatchHistoryEntry, MatchScheduleItem, PublicMatchDetail, Tournament } from '../types/domain';
import { formatEventDate } from '../utils/calendar';

const matchTime = (value: string) => new Date(value).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Baku' });
const allowedMaps = ['Erangel', 'Miramar', 'Rondo'];
// Display only scheduled official maps; never substitute a fictional rotation.
export function matchCenterMaps<T extends { map: string }>(matches: T[]): T[] {
  return matches.filter(match => allowedMaps.includes(match.map));
}
function startsIn(value: string, now: number) {
  const minutes = Math.ceil((Date.parse(value) - now) / 60000);
  if (!Number.isFinite(minutes)) return 'Vaxt gözlənilir';
  if (minutes <= 0) return 'Başlama gözlənilir';
  if (minutes < 60) return `${minutes} dəq sonra`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} saat${minutes % 60 ? ` ${minutes % 60} dəq` : ''} sonra`;
  return formatEventDate(value, { includeYear: false });
}
export function buildMatchCenterModel(schedule: MatchScheduleItem[], history: MatchHistoryEntry[]) {
  const live = schedule.filter((match) => match.status === 'live').sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const upcoming = schedule.filter((match) => match.status === 'upcoming' || match.status === 'scheduled').sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const recent = [...history].sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime());
  const primary = live[0] ?? upcoming[0];
  return {
    live,
    upcoming,
    recent,
    primary,
    primaryIsLive: live.length > 0,
    queued: live.length ? upcoming : upcoming.slice(1),
  };
}


function MatchCard({ match, tournament, detail, now }: { match: MatchScheduleItem; tournament?: Tournament; detail?: PublicMatchDetail; now: number }) {
  const live = match.status === 'live';
  const mapIndex = allowedMaps.indexOf(match.map);
  const rounds = tournament?.roundsPerDay;
  return <article className="match-card">
    <div className="match-card__scene">
      <img src={officialAssets.mapsSmall[mapIndex]} alt="" loading="lazy" />
      <div className="match-card__badges"><Link to={`/tournaments/${match.tournamentId}`} className="match-card__tournament"><span aria-hidden="true">Ⅼ</span>{tournament?.name ?? match.lobby}</Link><span className={`match-card__status${live ? ' is-live' : ''}`}>{live ? '● CANLI' : startsIn(match.startsAt, now)}</span></div>
      <h3>{match.map}</h3><p>{match.lobby || (match.stage === 'final' ? 'Final' : match.stage)} · R{match.round}</p>
    </div>
    <div className="match-card__footer"><span><Users size={17} aria-hidden="true" />{detail?.teamResults.length ? `${detail.teamResults.length} komanda` : 'Heyət gözlənilir'}</span><span><MapIcon size={17} aria-hidden="true" />{rounds ? `Map ${(match.round - 1) % rounds + 1}/${rounds}` : `R${match.round}`}</span><Link to={`/tournaments/${match.tournamentId}#matches`} state={{ roundId: match.id }}>{live ? 'İzləyin' : 'Detallar'}<ArrowRight size={16} aria-hidden="true" /></Link></div>
  </article>;
}
function UpcomingRow({ match, tournament, now }: { match: MatchScheduleItem; tournament?: Tournament; now: number }) {
  return <article className="match-ledger__row"><time dateTime={match.startsAt} title={formatEventDate(match.startsAt)}>{matchTime(match.startsAt)}</time><div><span>{tournament?.name ?? match.lobby}</span><p>{match.map} · R{match.round}</p></div><small>{startsIn(match.startsAt, now)}</small><Link to={`/tournaments/${match.tournamentId}#matches`} state={{ roundId: match.id }}>Detallar<ArrowRight size={16} aria-hidden="true" /></Link></article>;
}
function CompletedRow({ match }: { match: MatchHistoryEntry }) {
  return <article className="match-ledger__row"><time dateTime={match.playedAt} title={formatEventDate(match.playedAt)}>{matchTime(match.playedAt)}</time><div><span>{match.tournamentName}</span><p>{match.map} · {match.stageLabel}</p></div><strong>#{match.placement}</strong><Link to={`/tournaments/${match.tournamentId}#results`} state={{ roundId: match.id }}>Nəticələr<ArrowRight size={16} aria-hidden="true" /></Link></article>;
}
const tabs = ['İndi', 'Növbəti', 'Son nəticələr'] as const;
export function MatchCenterPage() {
  const [schedule, setSchedule] = useState<MatchScheduleItem[]>([]);
  const [history, setHistory] = useState<MatchHistoryEntry[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [details, setDetails] = useState<Record<string, PublicMatchDetail>>({});
  const [loading, setLoading] = useState<boolean>(serviceCapabilities.publicMatches);
  const [failed, setFailed] = useState(false);
  const [detailsFailed, setDetailsFailed] = useState(false);
  const [guest, setGuest] = useState(!serviceCapabilities.publicSession);
  const [tab, setTab] = useState(0);
  const [tournamentId, setTournamentId] = useState('');
  const [search, setSearch] = useState('');
  const [now, setNow] = useState(() => competitionNow().getTime());
  const [updatedAt, setUpdatedAt] = useState<number>();
  useEffect(() => {
    let active = true;
    if (serviceCapabilities.publicSession) services.auth.getSession().then((session) => { if (active) setGuest(!session); }).catch(() => { /* Keep CTA hidden when session is unknown. */ });
    return () => { active = false; };
  }, []);
  useEffect(() => { const timer = window.setInterval(() => setNow(competitionNow().getTime()), 30000); return () => window.clearInterval(timer); }, []);
  const load = useCallback(() => {
    if (!serviceCapabilities.publicMatches) return;
    setLoading(true); setFailed(false); setDetailsFailed(false);
    Promise.all([services.publicMatches.schedule(), services.publicMatches.history(), services.tournaments.list()])
      .then(async ([nextSchedule, nextHistory, nextTournaments]) => {
        const visibleSchedule = matchCenterMaps(nextSchedule);
        const visibleHistory = matchCenterMaps(nextHistory);
        setSchedule(visibleSchedule); setHistory(visibleHistory); setTournaments(nextTournaments);
        const ids = [...new Set([...visibleSchedule, ...visibleHistory].map((match) => match.id))];
        const results = await Promise.allSettled(ids.map((id) => services.publicMatches.get(id)));
        const nextDetails: Record<string, PublicMatchDetail> = {};
        results.forEach((result, index) => { if (result.status === 'fulfilled' && result.value) nextDetails[ids[index]] = result.value; });
        setDetails(nextDetails); setDetailsFailed(results.some((result) => result.status === 'rejected'));
        setUpdatedAt(competitionNow().getTime());
      }).catch(() => setFailed(true)).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);
  const all = useMemo(() => buildMatchCenterModel(schedule, history), [schedule, history]);
  const matchesFilter = (match: MatchScheduleItem | MatchHistoryEntry) => (!tournamentId || match.tournamentId === tournamentId) && (!search.trim() || details[match.id]?.teamResults.some((team) => team.teamName.toLocaleLowerCase('az').includes(search.trim().toLocaleLowerCase('az'))));
  const live = all.live.filter(matchesFilter), upcoming = all.upcoming.filter(matchesFilter), recent = all.recent.filter(matchesFilter);
  const liveTournaments = tournaments.filter((tournament) => all.live.some((match) => match.tournamentId === tournament.id));
  const activeTournamentCount = new Set([...all.live, ...all.upcoming].map((match) => match.tournamentId)).size;
  const cards = tab === 1 ? upcoming : [...live, ...upcoming.slice(0, Math.max(0, 6 - live.length))];
  const findTournament = (id: string) => tournaments.find((tournament) => tournament.id === id);
  const selectTab = (index: number, focus = false) => { setTab(index); if (focus) document.getElementById('match-tabs')?.scrollIntoView({ block: 'start', behavior: 'instant' }); };
  return <><section className="match-center"><div className="container">
    <header className="match-center__header"><div><span className="match-center__eyebrow">// AEVIC MATCH CENTER</span><h1>İndi. Sonra. Nəticə.</h1><p>Bütün turnirlər. Bütün komandalar. Bütün matçlar — bir yerdə.<br />PUBG Mobile səhnəsində nələr baş verir, canlı izlə.</p></div><div className="match-metrics" aria-label="Matç xülasəsi"><div><strong>{activeTournamentCount}</strong><b>aktiv turnir</b><span>hazırda</span></div><div><strong>{all.live.length}</strong><b>canlı matç</b><span>turnirlərdə</span></div><div><i aria-hidden="true" /><span>Son yenilənmə:</span><b>{updatedAt ? matchTime(new Date(updatedAt).toISOString()) : '—'}</b><span>Bakı vaxtı</span></div></div></header>
    <section className="match-live-strip" aria-label="Canlı turnirlər"><h2>// BU TURNİRLƏR CANLIDIR</h2><div><div className="match-live-strip__chips">{liveTournaments.length ? liveTournaments.map((tournament) => <Link key={tournament.id} to={`/tournaments/${tournament.id}`}><i aria-hidden="true" /><span><b>{tournament.name}</b><small>{all.live.filter((match) => match.tournamentId === tournament.id).length} matç canlı</small></span></Link>) : <p>Hazırda canlı turnir yoxdur.</p>}</div><Link className="match-text-link" to="/tournaments">Bütün turnirlərə bax<ArrowRight size={17} aria-hidden="true" /></Link></div></section>
    <div id="match-tabs" className="match-tabs" role="tablist" aria-label="Matç vəziyyəti">{tabs.map((label, index) => <button key={label} id={`match-tab-${index}`} role="tab" aria-selected={tab === index} aria-controls="match-panel" tabIndex={tab === index ? 0 : -1} onClick={() => selectTab(index)} onKeyDown={(event) => { let next = index; if (event.key === 'ArrowRight') next = (index + 1) % 3; else if (event.key === 'ArrowLeft') next = (index + 2) % 3; else if (event.key === 'Home') next = 0; else if (event.key === 'End') next = 2; else return; event.preventDefault(); selectTab(next); document.getElementById(`match-tab-${next}`)?.focus(); }}>{label}</button>)}</div>
    <div className="match-filters"><label htmlFor="match-tournament">Turnir</label><select id="match-tournament" value={tournamentId} onChange={(event) => setTournamentId(event.target.value)}><option value="">Bütün turnirlər</option>{tournaments.map((tournament) => <option key={tournament.id} value={tournament.id}>{tournament.name}</option>)}</select><label htmlFor="match-team">Komanda</label><div className="match-filters__search"><input id="match-team" type="search" placeholder="Komanda adı ilə axtar..." value={search} onChange={(event) => setSearch(event.target.value)} /><Search size={18} aria-hidden="true" /></div><button onClick={() => { setTournamentId(''); setSearch(''); }}>Təmizlə<RotateCcw size={16} aria-hidden="true" /></button></div>
    {!serviceCapabilities.publicMatches ? <EmptyState title="Növbəti raundu buradan izləyin" body="Hazırda ictimai matç proqramı yoxdur. Başlama vaxtları və nəticələr rəsmi mənbədən dərc edildikcə burada görünəcək." /> : loading ? <LoadingSkeleton variant="table" rows={7} /> : failed ? <EmptyState title="Matçlar yüklənmədi" body="Matç servisi hazırda cavab vermir." action={<Button variant="secondary" onClick={load}>Yenidən cəhd et</Button>} /> : <>
      {detailsFailed && <p role="status">Komanda məlumatlarının bir hissəsi yüklənmədi. Axtarış nəticələri natamam ola bilər.</p>}
      <section id="match-panel" role="tabpanel" aria-labelledby={`match-tab-${tab}`} tabIndex={0} className="match-current"><div className="match-section-heading"><div><h2>{tabs[tab]}</h2><p>{tab === 0 ? 'Hazırda davam edən matçlar — bütün turnirlər üzrə' : tab === 1 ? 'Yaxınlaşan matçlar — bütün turnirlər üzrə' : 'Dərc edilmiş matçlar — bütün turnirlər üzrə'}</p></div><strong aria-live="polite">{tab === 0 ? `${live.length} matç canlı` : `${tab === 1 ? upcoming.length : recent.length} matç`}</strong></div>
      {tab === 0 && !live.length && <p className="match-empty">Hazırda canlı matç yoxdur. Yaxınlaşan matçları aşağıda izləyin.</p>}
      {tab === 2 ? <div className="match-ledger">{recent.length ? recent.map((match) => <CompletedRow key={match.id} match={match} />) : <p className="match-empty">Dərc edilmiş nəticə yoxdur.</p>}</div> : cards.length ? <div className="match-grid">{cards.map((match) => <MatchCard key={match.id} match={match} tournament={findTournament(match.tournamentId)} detail={details[match.id]} now={now} />)}</div> : tab === 1 && <p className="match-empty">Uyğun planlanmış matç yoxdur.</p>}
      </section>
      <div className="match-lower"><section><div className="match-section-heading"><div><h2>Növbəti</h2><p>Yaxınlaşan matçlar — bütün turnirlər üzrə</p></div><button className="match-text-link" onClick={() => selectTab(1, true)}>Hamısını göstər<ArrowRight size={16} aria-hidden="true" /></button></div><div className="match-ledger">{upcoming.length ? upcoming.slice(0, 5).map((match) => <UpcomingRow key={match.id} match={match} tournament={findTournament(match.tournamentId)} now={now} />) : <p className="match-empty">Uyğun planlanmış matç yoxdur.</p>}</div></section><section><div className="match-section-heading"><div><h2>Son nəticələr</h2><p>Dərc edilmiş matçlar — bütün turnirlər üzrə</p></div><button className="match-text-link" onClick={() => selectTab(2, true)}>Hamısını göstər<ArrowRight size={16} aria-hidden="true" /></button></div><div className="match-ledger">{recent.length ? recent.slice(0, 5).map((match) => <CompletedRow key={match.id} match={match} />) : <p className="match-empty">Dərc edilmiş nəticə yoxdur.</p>}</div></section></div>
    </>}
  </div></section>{guest && <BrandJoinCta />}</>;
}
