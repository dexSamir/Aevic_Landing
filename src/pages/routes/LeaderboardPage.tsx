import {
Crown
} from 'lucide-react';
import { useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import {
DataTable,
EmptyState,
MobileDataList,
PageHeader,
TeamLogo
} from '../../components/common/primitives';
import { LeaderboardMovementCell } from '../../components/competition/CompetitionIntelligence';
import { competitionNow,services } from '../../services';
import { usePublicPlatformData } from '../../services/PlatformDataContext';
import '../../styles/public-pages.css';
import type { RankMovementData } from '../../types/domain';
import { selectLeaderboardTournament } from '../../utils/competitionSelectors';

export function LeaderboardPage() {
  const { tournaments, leaderboard: sourceLeaderboard, teams } = usePublicPlatformData();
  const featured = selectLeaderboardTournament(tournaments, sourceLeaderboard, competitionNow());
  const leaderboard = sourceLeaderboard.filter((row) => row.tournamentId === featured?.id).sort((a, b) => a.placement - b.placement || a.teamId.localeCompare(b.teamId));
  const leaderboardTeams = leaderboard.map((row) => teams.find((team) => team.id === row.teamId)?.name ?? 'Komanda adı dərc edilməyib');
  const [movement, setMovement] = useState<RankMovementData[]>([]);
  useEffect(() => { let active=true;setMovement([]);if(featured)services.results.movement(featured.id).then(value=>{if(active)setMovement(value);}).catch(()=>{if(active)setMovement([]);});return()=>{active=false;}; }, [featured?.id]);
  if (!featured || !leaderboard.length || !leaderboardTeams.length) return <section className="page-section leaderboard-page"><div className="container"><PageHeader title="Liderlik cədvəli" description="Turnir nəticələri dərc edildikdə liderlik sırası burada görünəcək." /><EmptyState title="Sıralama nəticədən başlayır" body="Hazırda dərc edilmiş sıralama yoxdur. Yer, kill və cərimə xallarının yekuna necə təsir etdiyini öyrənin." action={<Link className="button button--secondary" to="/regulations#rule-5">Xal sisteminə bax</Link>} /></div></section>;
  const movementByTeam = new Map(movement.map((item) => [item.teamId, item])); const hasMovement = movement.length > 0;
  const teamDestination = (teamName: string) => teams.find((team) => team.name === teamName);
  const teamIdentity = (teamName: string) => { const team = teamDestination(teamName); const content = <><TeamLogo name={teamName} src={team?.logoUrl} size="sm" /><strong>{teamName}</strong></>; return team ? <Link className="team-cell" to={`/teams/${team.slug}`}>{content}</Link> : <span className="team-cell">{content}</span>; };
  const rows = leaderboard.map((result, index) => [
    <span className={`rank-number ${index === 0 ? 'rank-number--winner' : ''}`}><b>{String(result.placement).padStart(2, '0')}</b></span>,
    teamIdentity(leaderboardTeams[index] ?? 'Komanda adı dərc edilməyib'),
    ...(hasMovement ? [<LeaderboardMovementCell movement={movementByTeam.get(result.teamId)} />] : []), result.matches, result.wwcd, result.placementPoints, result.finishPoints, result.penalties ? `−${result.penalties}` : '—', <strong>{result.totalPoints}</strong>,
  ]);
  const leaderName = leaderboardTeams[0]; const leaderTeam = teamDestination(leaderName);
  return <section className="page-section leaderboard-page"><div className="container"><PageHeader eyebrow={`${featured.shortName} · ${'Dərc edilmiş nəticə'}`} title="Liderlik cədvəli" description="WWCD, yer və kill xalları ayrı göstərilir; yalnız dərc edilmiş rəsmi nəticələr göstərilir." actions={<Link className="button button--secondary" to={`/tournaments/${featured.id}`}><span>Turnir detalı</span></Link>} /><div className="leaderboard-visual"><div className="champion-row"><Crown size={28} /><div><span>Cari lider</span>{leaderTeam ? <Link to={`/teams/${leaderTeam.slug}`}><strong>{leaderName}</strong></Link> : <strong>{leaderName}</strong>}<p>{leaderboard[0].matches} matç · {leaderboard[0].wwcd} WWCD</p></div><b>{leaderboard[0].totalPoints}<small>XAL</small></b></div></div><DataTable caption={`${featured.shortName} liderlik cədvəli`} headers={['Yer', 'Komanda', ...(hasMovement ? ['Dəyişmə'] : []), 'M', 'WWCD', 'Yer xalı', 'Kill xalı', 'Cərimə', 'Cəmi']} rows={rows} cutAfterRow={featured.qualification?.advancesThroughRank} cutLabel={featured.qualification?.label} /><MobileDataList items={leaderboard.map((result, index) => { const name = leaderboardTeams[index] ?? 'Komanda adı dərc edilməyib'; const team = teamDestination(name); return { title: <><span className="mobile-rank">#{result.placement}</span>{team ? <Link to={`/teams/${team.slug}`}>{name}</Link> : name}{hasMovement && <LeaderboardMovementCell movement={movementByTeam.get(result.teamId)} />}</>, meta: `${result.matches} matç · ${result.wwcd} WWCD`, value: `${result.totalPoints} xal`, details: <span>Yer {result.placementPoints} · Kill {result.finishPoints}{result.penalties ? ` · Cərimə −${result.penalties}` : ''}</span> }; })} /></div></section>;
}
