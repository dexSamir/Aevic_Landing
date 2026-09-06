import { ArrowRight, CalendarClock, Radio, Swords, Trophy } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EntityContextNav } from '../components/common/EntityContextNav';
import { Button, EmptyState, LoadingSkeleton, SectionHeading, StatusBadge } from '../components/common/primitives';
import { serviceCapabilities, services } from '../services';
import type { MatchHistoryEntry, MatchScheduleItem, Tournament } from '../types/domain';
import { formatEventDate } from '../utils/calendar';

const matchTime = (value: string) => new Date(value).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });
const matchDate = (value: string) => formatEventDate(value, { includeYear: false });

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

function ScheduleRow({ match, tournament, next = false }: { match: MatchScheduleItem; tournament?: Tournament; next?: boolean }) {
  return <article className={next ? 'is-current' : undefined}>
    {next && <span className="match-run-board__state">NÖVBƏTİ</span>}
    <b className="match-run-board__round">{String(match.round).padStart(2, '0')}</b>
    <span className="match-center__icon"><CalendarClock size={20} /></span>
    <div className="match-run-board__identity"><span>{tournament?.shortName ?? match.lobby} · {match.stage === 'final' ? 'Final' : match.stage}</span><h3>{match.map}</h3></div>
    <time dateTime={match.startsAt}>{matchTime(match.startsAt)}<small>{matchDate(match.startsAt)}</small></time>
    <StatusBadge status={match.status === 'upcoming' ? 'warning' : 'locked'}>{match.status === 'upcoming' ? 'Növbəti' : 'Planlanıb'}</StatusBadge>
    <Link className="match-run-board__action" to={`/tournaments/${match.tournamentId}#matches`} state={{ roundId: match.id }}><span>Turnir proqramı</span><ArrowRight size={17} /></Link>
  </article>;
}

function PrimaryMatch({ match, tournament, live }: { match: MatchScheduleItem; tournament?: Tournament; live: boolean }) {
  return <article className={`match-center-primary ${live ? 'is-live' : 'is-upcoming'}`}>
    <div className="match-center-primary__signal"><span>{live ? <Radio size={18} /> : <CalendarClock size={18} />}{live ? 'İNDİ CANLI' : 'NÖVBƏTİ YAYIM'}</span><b>{String(match.round).padStart(2, '0')}</b></div>
    <div className="match-center-primary__identity"><span>{tournament?.name ?? match.lobby}</span><h2>{match.map}</h2><p>{match.lobby} · {match.stage === 'final' ? 'Final' : match.stage} · Raund {match.round}</p></div>
    <div className="match-center-primary__time"><time dateTime={match.startsAt}>{matchTime(match.startsAt)}</time><span>{live ? 'Matç davam edir' : matchDate(match.startsAt)}</span></div>
    <div className="match-center-primary__actions"><StatusBadge status={live ? 'live' : 'warning'}>{live ? 'Canlı' : 'Növbəti'}</StatusBadge><Link className="button button--primary" to={`/tournaments/${match.tournamentId}#matches`} state={{ roundId: match.id }}><span>{live ? 'Canlı proqramı aç' : 'Turnir proqramı'}</span><ArrowRight size={17} /></Link>{tournament && <Link to={`/tournaments/${tournament.id}`}>Turnir səhifəsi <ArrowRight size={15} /></Link>}</div>
  </article>;
}

function CompletedRow({ match }: { match: MatchHistoryEntry }) {
  return <article className={match.wwcd ? 'is-winner' : ''}>
    <b className="match-run-board__round">{match.stageLabel.match(/R(\d+)/)?.[1]?.padStart(2, '0') ?? '—'}</b>
    <span className="match-center__icon">{match.wwcd ? <Trophy size={20} /> : <Swords size={20} />}</span>
    <div className="match-run-board__identity"><span>{match.tournamentName} · {match.stageLabel}</span><h3>{match.map}</h3>{match.wwcd && <strong>WWCD</strong>}</div>
    <dl><div><dt>Yer</dt><dd>#{match.placement}</dd></div><div><dt>Kill</dt><dd>{match.finishes}</dd></div><div><dt>Xal</dt><dd>{match.points}</dd></div></dl>
    <Link className="match-run-board__action" to={`/tournaments/${match.tournamentId}#results`} state={{ roundId: match.id }} aria-label={`${match.map} nəticəsini turnirdə aç`}><span>Nəticələr</span><ArrowRight size={17} /></Link>
  </article>;
}

export function MatchCenterPage() {
  const [schedule, setSchedule] = useState<MatchScheduleItem[]>([]);
  const [history, setHistory] = useState<MatchHistoryEntry[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(serviceCapabilities.publicMatches);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    if (!serviceCapabilities.publicMatches) {
      setLoading(false);
      setFailed(false);
      return;
    }
    setLoading(true);
    setFailed(false);
    Promise.all([services.publicMatches.schedule(), services.publicMatches.history(), services.tournaments.list()])
      .then(([nextSchedule, nextHistory, nextTournaments]) => { setSchedule(nextSchedule); setHistory(nextHistory); setTournaments(nextTournaments); })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const { live, recent, primary, primaryIsLive, queued } = useMemo(() => buildMatchCenterModel(schedule, history), [schedule, history]);
  const primaryTournament = tournaments.find((item) => item.id === primary?.tournamentId);
  const runDate = primary?.startsAt ?? recent[0]?.playedAt;

  return <section className="page-section match-center"><div className="container">
    <header className="match-run-board__masthead" data-reveal data-reveal-variant="fade"><div><span>AEVIC MATCH CENTER</span><h1>İndi. Sonra. Nəticə.</h1><p>Canlı yarış vəziyyəti, növbəti raundlar və son dərc edilmiş nəticələr bir axında.</p></div><div><strong>{primaryTournament?.name ?? recent[0]?.tournamentName ?? 'AEVIC yarış cədvəli'}</strong>{runDate && <time dateTime={runDate}>{formatEventDate(runDate)}</time>}</div></header>
    {serviceCapabilities.publicMatches && <EntityContextNav label="Match Center bölmələri" items={[{ label: 'İndi', href: '#now', current: true }, { label: 'Növbəti', href: '#next' }, { label: 'Son nəticələr', href: '#recent' }]} action={primaryTournament ? <Link to={`/tournaments/${primaryTournament.id}`}>Turnir <ArrowRight size={15} /></Link> : undefined} />}

    {!serviceCapabilities.publicMatches ? <EmptyState title="Növbəti raundu buradan izləyin" body="Hazırda ictimai matç proqramı yoxdur. Başlama vaxtları və nəticələr rəsmi mənbədən dərc edildikcə burada görünəcək." action={<Link className="button button--secondary" to="/regulations"><span>Yarış formatını öyrən</span><ArrowRight size={17} /></Link>} /> : loading ? <LoadingSkeleton rows={7} /> : failed ? <EmptyState title="Matçlar yüklənmədi" body="Matç servisi hazırda cavab vermir. Şəbəkəni yoxlayıb yenidən cəhd edin." action={<Button variant="secondary" onClick={load}>Yenidən cəhd et</Button>} /> : <>
      <section id="now" className="match-center-section match-center-section--now">
        <SectionHeading title="İndi" description={live.length ? `${live.length} canlı matç` : primary ? 'Canlı matç yoxdur — ən yaxın raund göstərilir' : 'Aktiv yarış vəziyyəti yoxdur'} />
        {primary ? <PrimaryMatch match={primary} tournament={primaryTournament} live={primaryIsLive} /> : <EmptyState icon={<Radio size={28} />} title="Hazırda canlı və ya planlanmış matç yoxdur" body="Yeni raund dərc edilənədək son rəsmi nəticələrə baxa bilərsiniz." />}
      </section>

      <section id="next" className="match-center-section match-center-section--next">
        <SectionHeading title="Növbəti" description="Yaxın raundlar xronoloji ardıcıllıqla" />
        {queued.length ? <div className="match-center__list match-run-board">{queued.map((match, index) => <ScheduleRow key={match.id} match={match} tournament={tournaments.find((item) => item.id === match.tournamentId)} next={live.length > 0 && index === 0} />)}</div> : <EmptyState icon={<CalendarClock size={28} />} title="Əlavə matç planlanmayıb" body={primary && !live.length ? 'Ən yaxın matç İndi bölməsində göstərilir.' : 'Yeni yarış raundu dərc edildikdə burada görünəcək.'} />}
      </section>

      <section id="recent" className="match-center-section match-center-section--recent">
        <SectionHeading title="Son nəticələr" description="Dərc edilmiş matçlar daha sıx arxiv görünüşündə" action={<Link to="/records">Rekordlar</Link>} />
        {recent.length ? <div className="match-center__list match-run-board match-run-board--completed">{recent.map((match) => <CompletedRow key={match.id} match={match} />)}</div> : <EmptyState icon={<Swords size={28} />} title="Dərc edilmiş nəticə yoxdur" body="Rəsmi nəticələr dərc edildikdən sonra bu arxivdə görünəcək." />}
      </section>
    </>}
  </div></section>;
}
