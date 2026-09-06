import { ArrowRight, BarChart3, Trophy } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import type { PublicTeamSummary, TeamTournamentResult } from '../../types/domain';
import { DataTable, EmptyState, MobileDataList, SectionHeading, TeamLogo } from '../common/primitives';

const LazySharecardGenerator = lazy(async () => ({ default: (await import('./SharecardGenerator')).SharecardGenerator }));

export function TournamentResults({ standings, teamNames, teams, publishedRoundCount = 0, tournamentName, tournamentId, publishedAt }: { standings: TeamTournamentResult[]; teamNames: string[]; teams: PublicTeamSummary[]; publishedRoundCount?: number; tournamentName?: string; tournamentId: string; publishedAt?: string }) {
  const ordered = standings.filter((row) => row.tournamentId === tournamentId).sort((left, right) => left.placement - right.placement);
  const nameFor = (row: TeamTournamentResult) => teams.find((team) => team.id === row.teamId)?.name ?? 'Komanda adı dərc edilməyib';
  const teamFor = (name: string) => teams.find((team) => team.name === name);
  const identity = (name: string) => {
    const team = teamFor(name);
    const content = <><TeamLogo name={name} src={team?.logoUrl} size="sm" /><strong>{name}</strong></>;
    return team ? <Link className="team-cell" to={`/teams/${team.slug}`}>{content}</Link> : <span className="team-cell">{content}</span>;
  };

  return <section id="results" className="tournament-results" aria-labelledby="tournament-results-title">
    <SectionHeading headingId="tournament-results-title" title="Rəsmi nəticələr" description={ordered.length ? `${ordered.length} komanda · dərc edilmiş ümumi sıralama` : 'Yalnız rəsmi olaraq dərc edilmiş standings burada göstərilir'} />
    {ordered.length ? <>
      <div className="tournament-results__summary"><span><Trophy size={18} aria-hidden="true" /><strong>{nameFor(ordered[0])}</strong><small>Lider</small></span><span><BarChart3 size={18} aria-hidden="true" /><strong>{Math.max(...ordered.map((result) => result.matches))}</strong><small>raund üzrə hesabat</small></span><span><strong>{ordered.reduce((sum, result) => sum + result.wwcd, 0)}</strong><small>ümumi WWCD</small></span>{publishedRoundCount > 0 && <span><strong>{publishedRoundCount}</strong><small>public raund qeydi</small></span>}</div>
      {tournamentName && publishedAt && <Suspense fallback={<div className="sharecard-inline-loading">Sharecard hazırlanır…</div>}><LazySharecardGenerator compactDownload initialFamily="leaderboard" showFamilySelector={false} teamName={nameFor(ordered[0])} tournamentName={tournamentName} tournamentId={tournamentId} standings={ordered.map((row) => ({ tournamentId: row.tournamentId, teamId: row.teamId, rank: row.placement, team: nameFor(row), wwcd: row.wwcd, placementPoints: row.placementPoints, killPoints: row.finishPoints, totalPoints: row.totalPoints }))} provenance={{ tournamentId, occurredAt: publishedAt, stageLabel: 'Yekun sıralama', sourceLabel: 'Dərc edilmiş rəsmi nəticə' }} /></Suspense>}
      <DataTable caption="Turnir üzrə rəsmi ümumi sıralama" headers={['Yer', 'Komanda', 'Raund', 'WWCD', 'Yer xalı', 'Kill xalı', 'Cərimə', 'Cəmi']} rows={ordered.map((result, index) => [<b className="result-rank">#{result.placement}</b>, identity(nameFor(result)), result.matches, result.wwcd, result.placementPoints, result.finishPoints, result.penalties ? `−${result.penalties}` : '—', <strong>{result.totalPoints}</strong>])} />
      <MobileDataList items={ordered.map((result, index) => { const name = nameFor(result); const team = teamFor(name); return { title: <><span className="mobile-rank">#{result.placement}</span>{team ? <Link to={`/teams/${team.slug}`}>{name}</Link> : name}</>, meta: `${result.matches} raund · ${result.wwcd} WWCD`, value: `${result.totalPoints} xal`, details: <span>Yer {result.placementPoints} · Kill {result.finishPoints}{result.penalties ? ` · Cərimə −${result.penalties}` : ''}</span> }; })} />
    </> : <EmptyState icon={<BarChart3 size={27} />} title="Ümumi sıralama dərc edilməyib" body="Bu turnirin yekun komanda sıralaması hələ təsdiqlənməyib. Dərc edilmiş raundları matç mərkəzindən yoxlaya bilərsiniz; qismən nəticələr final kimi göstərilmir." action={<Link className="button button--secondary" to="/matches"><span>Matç Mərkəzi</span><ArrowRight size={16} /></Link>} />}
  </section>;
}
