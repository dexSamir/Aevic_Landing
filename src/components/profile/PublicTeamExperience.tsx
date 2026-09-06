import { BellPlus, CalendarClock, Crown, GitCompareArrows, Share2, Swords, Trophy } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { services } from '../../services';
import type { MatchHistoryEntry, MatchScheduleItem, TeamMember } from '../../types/domain';
import { Button, EmptyState, StatusBadge, Toast } from '../common/primitives';
import { CalendarAction } from '../competition/CalendarAction';

export function FollowTeamEntry({ teamId }: { teamId: string }) {
  const supported = Boolean(services.follows);
  return <Button variant="secondary" aria-pressed={false} aria-label={supported ? 'Komandanı izlə' : 'Komandanı izləmək üçün hesab-backed follow servisi tələb olunur'} disabled={!supported} title={supported ? 'Komandanı izlə' : 'İzləmə üçün hesab və backend tələb olunur'} icon={<BellPlus size={17} />}>{supported ? 'İzlə' : 'İzlə · tezliklə'}</Button>;
}

export function ShareProfileAction({ teamName }: { teamName: string }) {
  const [shared, setShared] = useState(false);
  const share = async () => {
    const data = { title: `${teamName} · AEVIC`, text: `${teamName} komandasının public profilinə bax.`, url: window.location.href };
    if (navigator.share) await navigator.share(data); else await navigator.clipboard.writeText(window.location.href);
    setShared(true); window.setTimeout(() => setShared(false), 1800);
  };
  return <>{shared && <Toast title="Profil keçidi hazırdır" body="Keçid paylaşma panelinə göndərildi və ya panoya kopyalandı." onClose={() => setShared(false)} />}<Button variant="ghost" onClick={() => void share()} icon={<Share2 size={17} />}>Paylaş</Button></>;
}

export function PublicRoster({ roster }: { roster: TeamMember[] }) {
  const ordered = [...roster].sort((a, b) => ({ captain: 0, starter: 1, substitute: 2 }[a.role] - { captain: 0, starter: 1, substitute: 2 }[b.role]));
  return <div className="public-roster">{ordered.map((player, index) => <article className={player.role === 'substitute' ? 'public-roster__sub' : ''} key={player.id}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{player.ign}</h3><p>{player.role === 'captain' ? 'Kapitan' : player.role === 'starter' ? 'Əsas heyət' : 'Əvəzedici'}</p></div>{player.role === 'captain' && <Crown size={17} aria-label="Kapitan" />}</article>)}</div>;
}

export function UpcomingMatchCard({ match }: { match?: MatchScheduleItem }) {
  if (!match) return null;
  const calendarEvent = { id: `match-${match.id}`, title: `AEVIC — ${match.map} R${match.round}`, description: `${match.lobby} · ${match.stage} · public match schedule`, startsAt: match.startsAt, timezone: 'Asia/Baku', location: `${match.lobby} · ${match.map}`, publicUrl: new URL('/matches', window.location.origin).toString() };
  return <article className="upcoming-match-card"><Link to="/matches"><CalendarClock size={22} /><div><span>Növbəti matç · {match.lobby}</span><strong>{match.map} · Raund {match.round}</strong><time dateTime={match.startsAt}>{new Date(match.startsAt).toLocaleString('az-AZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time></div><StatusBadge status="warning">Planlanıb</StatusBadge></Link><CalendarAction event={calendarEvent} compact /></article>;
}

export function RecentMatchList({ matches }: { matches: MatchHistoryEntry[] }) {
  if (!matches.length) return <EmptyState icon={<Swords size={27} />} title="Dərc edilmiş matç yoxdur" body="Bu komanda üçün təsdiqlənmiş round nəticəsi yayımlandıqda burada görünəcək." />;
  return <div className="recent-match-list">{matches.map((match) => <Link to={`/tournaments/${match.tournamentId}#results`} state={{ roundId: match.id }} key={match.id}><div><span>{match.tournamentName}</span><strong>{match.map} · {match.stageLabel}</strong><time dateTime={match.playedAt}>{new Date(match.playedAt).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short', year: 'numeric' })}</time></div><dl><div><dt>Yer</dt><dd>#{match.placement}</dd></div><div><dt>Kill</dt><dd>{match.finishes}</dd></div><div><dt>Xal</dt><dd>{match.points}</dd></div></dl>{match.wwcd && <Trophy size={18} aria-label="WWCD" />}</Link>)}</div>;
}

export function PerformanceTrend({ matches }: { matches: MatchHistoryEntry[] }) {
  if (matches.length < 2) return null;
  const max = Math.max(...matches.map((match) => match.points), 1);
  return <div className="performance-trend" aria-label="Son matçların xal trendi"><header><span>Son matç trendi</span><strong>{matches.reduce((sum, match) => sum + match.points, 0)} xal</strong></header><div>{[...matches].reverse().map((match) => <span key={match.id} style={{ height: `${Math.max(18, (match.points / max) * 100)}%` }} title={`${match.map}: ${match.points} xal`} />)}</div></div>;
}

export function ComparisonLink({ teamSlug }: { teamSlug: string }) {
  return <Link className="button button--ghost" to={`/teams/compare?team=${teamSlug}`}><GitCompareArrows size={17} /><span>Müqayisə et</span></Link>;
}

export function ProfileCardLink({ teamSlug }: { teamSlug: string }) {
  return <Link className="button button--primary" to={`/teams/${teamSlug}/share-card`}><Share2 size={17} /><span>Paylaş</span></Link>;
}
