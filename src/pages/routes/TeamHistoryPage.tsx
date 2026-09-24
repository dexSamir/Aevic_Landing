import {
ArrowRight,
History
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
DataTable,
EmptyState,
MobileDataList,
PageHeader,
SectionHeading,
Tabs
} from '../../components/common/primitives';
import { CareerNav } from '../../components/team/TeamCareerNav';
import { useTeamCompetitionContexts,useTeamPlatformData } from '../../services/PlatformDataContext';

export function TeamHistoryPage() {
  const { matchHistory, historyAvailable } = useTeamPlatformData();
  const { all } = useTeamCompetitionContexts();
  const [mapFilter, setMapFilter] = useState('all');
  const published = [...matchHistory].sort((left, right) => new Date(right.playedAt).getTime() - new Date(left.playedAt).getTime());
  const rounds = published.filter((round) => mapFilter === 'all' || round.map.toLowerCase() === mapFilter);
  const latestTournamentId = published[0]?.tournamentId;
  const latestContext = latestTournamentId ? all.find((context) => context.tournament.id === latestTournamentId) : undefined;
  const latestRounds = latestTournamentId ? published.filter((round) => round.tournamentId === latestTournamentId) : [];
  const bestPlacement = published.length ? Math.min(...published.map((round) => round.placement)) : undefined;
  const wwcd = published.filter((round) => round.wwcd).length;
  const finishes = published.reduce((total, round) => total + round.finishes, 0);
  const latestPoints = latestRounds.reduce((total, round) => total + round.points, 0);
  if(historyAvailable===false)return <EmptyState title="Nəticə formatı hələ dəstəklənmir" body="Mövcud nəticələr dəyişdirilməyib. Bu məlumatın göstərilməsi üçün format təsdiqlənməlidir." />;
  return <><PageHeader eyebrow="Dərc edilmiş nəticələr" title="Komanda tarixçəsi" description="Raund səviyyəli nəticələr və xəritə filtrləri. Yalnız mövcud mənbə məlumatları göstərilir." actions={latestTournamentId ? <Link className="button button--secondary" to={`/tournaments/${latestTournamentId}`}><span>Son turnir</span><ArrowRight size={16} /></Link> : undefined} /><CareerNav /><Tabs active={mapFilter} onChange={setMapFilter} items={[{ id: 'all', label: 'Bütün xəritələr' }, { id: 'erangel', label: 'Erangel' }, { id: 'miramar', label: 'Miramar' }, { id: 'rondo', label: 'Rondo' }]} /><section className="history-summary"><div><span>İştiraklar</span><strong>{new Set(published.map((round) => round.tournamentId)).size}</strong></div><div><span>Ən yaxşı raund yeri</span><strong>{bestPlacement ? `#${String(bestPlacement).padStart(2, '0')}` : '—'}</strong></div><div><span>WWCD</span><strong>{wwcd}</strong></div><div><span>Ümumi kill</span><strong>{finishes}</strong></div><div><span>Dərc edilmiş raundlar</span><strong>{published.length}</strong></div></section>{latestContext && <section className="history-tournament"><div><span>Son tamamlanan</span><h2>{latestContext.tournament.name}</h2><p>{latestRounds.length} dərc edilmiş raund · {latestRounds.filter((round) => round.wwcd).length} WWCD · {latestPoints} xal</p></div><div className="history-placement"><strong>{latestContext.participation.resultPlacement ? String(latestContext.participation.resultPlacement).padStart(2, '0') : '—'}</strong><span>Yekun yer</span></div></section>}<SectionHeading title="Raundlar üzrə" description="Hər dərc edilmiş raund turnirin nəticə bölməsində yoxlanır." />{rounds.length ? <><DataTable headers={['Tarix', 'Turnir', 'Mərhələ / Raund', 'Xəritə', 'Yer', 'Kill', 'WWCD', 'Cəmi']} rows={rounds.map((row) => [new Date(row.playedAt).toLocaleDateString('az-AZ'), row.tournamentName, <Link to={`/tournaments/${row.tournamentId}#results`} state={{ roundId: row.id }}>{row.stageLabel}</Link>, row.map, `#${row.placement}`, row.finishes, row.wwcd ? 'Bəli' : '—', <strong>{row.points}</strong>])} /><MobileDataList items={rounds.map((row) => ({ title: <Link to={`/tournaments/${row.tournamentId}#results`} state={{ roundId: row.id }}>{row.map}</Link>, meta: `${row.tournamentName} · ${row.stageLabel}`, value: `${row.points} xal`, details: `Yer #${row.placement} · ${row.finishes} kill` }))} /></> : <EmptyState icon={<History size={24} />} title="Bu xəritə üzrə nəticə yoxdur" body="Dərc edilmiş nəticələri göstərmək üçün başqa xəritə filtrini seçin." />}</>;
}
