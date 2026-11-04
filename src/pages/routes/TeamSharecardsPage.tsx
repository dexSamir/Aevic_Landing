import '../../styles/share-controls.css';
import {
ArrowRight,
Check,
ShieldCheck,
Swords,
Trophy
} from 'lucide-react';
import { Suspense,useEffect,useState,type KeyboardEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
PageHeader
} from '../../components/common/primitives';
import { TeamWrappedEntry } from '../../components/team/TeamCareerNav';
import { useTeamCompetitionContexts,useTeamPlatformData } from '../../services/PlatformDataContext';
import { services } from '../../services';
import { usePlatformQuery } from '../../services/queryCache';
import type { TeamProfileCardData } from '../../types/domain';
import { summarizeMapPerformance } from '../../utils/competitionAnalytics';
import { publicTeamUrl } from '../../utils/publicUrl';
import { deriveTournamentResultBreakdown } from '../../utils/resultBreakdown';
import { LazyProfileCardGenerator,LazySharecardGenerator } from './TeamPagesShared';
export function TeamSharecardsPage() {
  const { currentTeam, leaderboard, publicTeams: teams = [], matchHistory, careerSummary } = useTeamPlatformData();
  const { all } = useTeamCompetitionContexts();
  const [params] = useSearchParams();
  const selectedId = params.get('tournament');
  const requestedMode = params.get('type') === 'leaderboard' ? 'leaderboard' : 'identity';
  const [studioMode, setStudioMode] = useState<'identity' | 'result' | 'leaderboard'>(requestedMode);
  useEffect(() => setStudioMode(requestedMode), [requestedMode, selectedId]);
  const selectedContext = selectedId ? all.find(context => context.tournament.id === selectedId) : undefined;
  const official = usePlatformQuery({ key: `tournament:${selectedId}:leaderboard`, scope: 'public', enabled: Boolean(selectedContext), query: signal => services.results.leaderboard(selectedId!, signal) });
  const snapshots = usePlatformQuery({ key: `tournament:${selectedId}:snapshots`, scope: 'public', enabled: Boolean(selectedContext), query: signal => services.results.snapshots(selectedId!, signal), retry: 0 });
  const latestPublishedMatch = [...matchHistory].sort((left, right) => new Date(right.playedAt).getTime() - new Date(left.playedAt).getTime())[0];
  const resultContext = selectedId ? selectedContext : latestPublishedMatch ? all.find((context) => context.tournament.id === latestPublishedMatch.tournamentId && context.participation.resultPlacement) : undefined;
  const resultTournament = resultContext?.tournament;
  const publishedRounds = matchHistory.filter((match) => match.tournamentId === resultTournament?.id);
  const result = resultTournament && resultContext?.participation.resultPlacement ? deriveTournamentResultBreakdown({ tournamentId: resultTournament.id, teamId: currentTeam.id, placement: resultContext.participation.resultPlacement, matches: publishedRounds, formula: resultTournament.pointFormula }) : undefined;
  const resultProvenance = result?.stage && result.occurredAt ? { tournamentId: result.tournamentId, occurredAt: result.occurredAt, stageLabel: result.stage === 'final' ? 'Final sıralaması' : result.stage, sourceLabel: 'Dərc edilmiş nəticə' } : null;
  const latestSnapshot = snapshots.data?.filter(snapshot => snapshot.tournamentId === resultTournament?.id && Number.isFinite(Date.parse(snapshot.publishedAt))).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))[0];
  const latestRound = [...publishedRounds].filter(round => Number.isFinite(Date.parse(round.playedAt))).sort((a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt))[0];
  const standingsDate = latestSnapshot?.publishedAt ?? latestRound?.playedAt;
  const provenance = studioMode === 'leaderboard' && resultTournament && standingsDate ? { tournamentId: resultTournament.id, occurredAt: standingsDate, stageLabel: 'Rəsmi sıralama', sourceLabel: 'Dərc edilmiş nəticə' } : resultProvenance;
  const standings = (selectedId ? official.data ?? [] : leaderboard).filter((row) => row.tournamentId === resultTournament?.id).sort((a, b) => a.placement - b.placement).map((row) => ({ tournamentId: row.tournamentId, teamId: row.teamId, rank: row.placement, team: row.teamId === currentTeam.id ? currentTeam.name : teams.find((team) => team.id === row.teamId)?.name ?? 'Komanda adı yoxdur', matches: row.matches, penalties: row.penalties, wwcd: row.wwcd, placementPoints: row.placementPoints, killPoints: row.finishPoints, totalPoints: row.totalPoints }));
  const metric = (key: string) => careerSummary.metrics.find((item) => item.key === key)?.value;
  const identityData: TeamProfileCardData = { teamId: currentTeam.id, teamName: currentTeam.name, teamLogo: currentTeam.logoUrl, teamTag: currentTeam.tag, country: currentTeam.country, profileUrl: publicTeamUrl(currentTeam.slug ?? currentTeam.id), matches: metric('matches'), finishes: metric('finishes'), wwcd: metric('wwcd'), championships: metric('championships'), podiums: metric('podiums'), mapStats: summarizeMapPerformance(currentTeam.id, matchHistory).metrics, recentMatches: [...matchHistory].sort((a,b) => Date.parse(b.playedAt) - Date.parse(a.playedAt)).slice(0,5), roster: currentTeam.roster.map(({ ign, role }) => ({ ign, role })), sourceLabel: currentTeam.legacyHistoryIncomplete ? 'Recorded official results · Earlier history may be incomplete' : 'Published official results' };
  const assetTypes = [
    { id: 'identity' as const, label: 'Komanda kimliyi', description: 'Daimi profil aktivi', icon: ShieldCheck },
    { id: 'result' as const, label: 'Turnir nəticəsi', description: 'Dərc edilmiş yekun', icon: Trophy },
    { id: 'leaderboard' as const, label: 'Liderlik cədvəli', description: 'Turnir sıralaması', icon: Swords },
  ];
  const selectFromKeyboard = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? assetTypes.length - 1 : delta ? (index + delta + assetTypes.length) % assetTypes.length : -1;
    if (next < 0) return;
    const group = event.currentTarget.parentElement;
    event.preventDefault(); setStudioMode(assetTypes[next].id);
    window.requestAnimationFrame(() => group?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus());
  };
  return <><PageHeader className="share-studio-header" eyebrow="Paylaşım studiyası" title="Paylaşım növünü seçin" description="Rəsmi komanda kartı, PNG ixracı və dərc edilmiş yarış nəticələri." actions={<Link className="button button--secondary" to={`/teams/${encodeURIComponent(currentTeam.slug ?? currentTeam.id)}`}>Public profil <ArrowRight size={16} /></Link>} /><div className="asset-type-selector" role="radiogroup" aria-label="Aktiv növü">{assetTypes.map(({ id, label, description, icon: Icon }, index) => <button key={id} type="button" role="radio" aria-checked={studioMode === id} tabIndex={studioMode === id ? 0 : -1} onKeyDown={(event) => selectFromKeyboard(event, index)} onClick={() => setStudioMode(id)}><Icon size={19} aria-hidden="true" /><span><strong>{label}</strong><small>{description}</small></span><Check size={17} aria-hidden="true" /></button>)}</div><div id="share-studio-panel" className="share-studio-panel" aria-live="polite">{selectedId && !selectedContext && <p role="status">Seçilmiş turnir əlçatan deyil.</p>}{selectedContext && studioMode === 'leaderboard' && (official.loading || snapshots.loading) && <p role="status">Rəsmi sıralama yüklənir…</p>}{selectedContext && studioMode === 'leaderboard' && official.error && <p role="status">Sıralama yüklənmədi. Səhifəni yenidən açın.</p>}<Suspense fallback={<div className="route-loading">Kart hazırlanır…</div>}>{studioMode === 'identity' ? <LazyProfileCardGenerator data={identityData} /> : <LazySharecardGenerator key={`${studioMode}:${resultTournament?.id}`} initialFamily={studioMode} showFamilySelector={false} teamName={currentTeam.name} teamLogo={currentTeam.logoUrl} tournamentId={resultTournament?.id ?? ''} tournamentName={resultTournament?.name ?? ''} result={result} standings={standings} provenance={provenance} />}</Suspense></div><TeamWrappedEntry /></>;
}
