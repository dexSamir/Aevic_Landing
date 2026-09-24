import {
ArrowRight,
Check,
ShieldCheck,
Swords,
Trophy
} from 'lucide-react';
import { Suspense,useState,type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import {
PageHeader
} from '../../components/common/primitives';
import { CareerNav,TeamWrappedEntry } from '../../components/team/TeamCareerNav';
import { useTeamCompetitionContexts,useTeamPlatformData } from '../../services/PlatformDataContext';
import type { TeamProfileCardData } from '../../types/domain';
import { publicTeamUrl } from '../../utils/publicUrl';
import { deriveTournamentResultBreakdown } from '../../utils/resultBreakdown';
import { LazyProfileCardGenerator,LazySharecardGenerator } from './TeamPagesShared';
export function TeamSharecardsPage() {
  const { currentTeam, leaderboard, publicTeams: teams = [], matchHistory, careerSummary } = useTeamPlatformData();
  const { all } = useTeamCompetitionContexts();
  const [studioMode, setStudioMode] = useState<'identity' | 'result' | 'leaderboard'>('identity');
  const latestPublishedMatch = [...matchHistory].sort((left, right) => new Date(right.playedAt).getTime() - new Date(left.playedAt).getTime())[0];
  const resultContext = latestPublishedMatch ? all.find((context) => context.tournament.id === latestPublishedMatch.tournamentId && context.participation.resultPlacement) : undefined;
  const resultTournament = resultContext?.tournament;
  const publishedRounds = matchHistory.filter((match) => match.tournamentId === resultTournament?.id);
  const result = resultTournament && resultContext?.participation.resultPlacement ? deriveTournamentResultBreakdown({ tournamentId: resultTournament.id, teamId: currentTeam.id, placement: resultContext.participation.resultPlacement, matches: publishedRounds, formula: resultTournament.pointFormula }) : undefined;
  const provenance = result?.stage && result.occurredAt ? { tournamentId: result.tournamentId, occurredAt: result.occurredAt, stageLabel: result.stage === 'final' ? 'Final sıralaması' : result.stage, sourceLabel: 'Dərc edilmiş nəticə' } : null;
  const standings = leaderboard.filter((row) => row.tournamentId === resultTournament?.id).sort((a, b) => a.placement - b.placement).map((row) => ({ tournamentId: row.tournamentId, teamId: row.teamId, rank: row.placement, team: teams.find((team) => team.id === row.teamId)?.name ?? 'Komanda adı yoxdur', wwcd: row.wwcd, placementPoints: row.placementPoints, killPoints: row.finishPoints, totalPoints: row.totalPoints }));
  const metric = (key: string) => careerSummary.metrics.find((item) => item.key === key)?.value;
  const identityData: TeamProfileCardData = { teamId: currentTeam.id, teamName: currentTeam.name, teamLogo: currentTeam.logoUrl, teamBanner: currentTeam.bannerUrl, teamTag: currentTeam.tag, country: currentTeam.country, profileUrl: publicTeamUrl(currentTeam.slug ?? currentTeam.id), matches: metric('matches'), finishes: metric('finishes'), wwcd: metric('wwcd'), championships: metric('championships'), podiums: metric('podiums'), roster: currentTeam.roster.map(({ ign, role }) => ({ ign, role })), sourceLabel: 'Published public roster and career stats' };
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
  return <><PageHeader className="share-studio-header" eyebrow="Paylaşım studiyası" title="Paylaşım növünü seçin" description="Rəsmi komanda kartı, PNG ixracı və dərc edilmiş yarış nəticələri." actions={<Link className="button button--secondary" to={`/teams/${encodeURIComponent(currentTeam.slug ?? currentTeam.id)}`}>Public profil <ArrowRight size={16} /></Link>} /><CareerNav /><div className="asset-type-selector" role="radiogroup" aria-label="Aktiv növü">{assetTypes.map(({ id, label, description, icon: Icon }, index) => <button key={id} type="button" role="radio" aria-checked={studioMode === id} tabIndex={studioMode === id ? 0 : -1} onKeyDown={(event) => selectFromKeyboard(event, index)} onClick={() => setStudioMode(id)}><Icon size={19} aria-hidden="true" /><span><strong>{label}</strong><small>{description}</small></span><Check size={17} aria-hidden="true" /></button>)}</div><div id="share-studio-panel" className="share-studio-panel" aria-live="polite"><Suspense fallback={<div className="route-loading">Kart hazırlanır…</div>}>{studioMode === 'identity' ? <LazyProfileCardGenerator data={identityData} /> : <LazySharecardGenerator key={studioMode} initialFamily={studioMode} showFamilySelector={false} teamName={currentTeam.name} teamLogo={currentTeam.logoUrl} tournamentId={resultTournament?.id ?? ''} tournamentName={resultTournament?.name ?? ''} result={result} standings={standings} provenance={provenance} />}</Suspense></div><TeamWrappedEntry /></>;
}
