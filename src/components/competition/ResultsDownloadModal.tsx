import { lazy, Suspense, useState, type KeyboardEvent } from 'react';
import { Modal } from '../common/primitives';
import { usePublicSession } from '../../services/PublicSessionContext';
import type { PublicTeamSummary, TeamTournamentResult, TournamentResultBreakdown } from '../../types/domain';
import './results-download.css';

const Generator = lazy(() => import('./SharecardGenerator').then(module => ({ default: module.SharecardGenerator })));

export function ResultsDownloadModal({ open, onClose, standings, teams, tournamentId, tournamentName, publishedAt }: {
  open: boolean; onClose: () => void; standings: TeamTournamentResult[]; teams: PublicTeamSummary[];
  tournamentId: string; tournamentName?: string; publishedAt?: string;
}) {
  const { session, team } = usePublicSession();
  const [selected, setSelected] = useState<'leaderboard' | 'result'>('leaderboard');
  const ownRow = team && standings.find(row => row.teamId === team.id && row.tournamentId === tournamentId);
  const family = selected === 'result' && ownRow ? 'result' : 'leaderboard';
  // Aggregate values stay authoritative even when individual rounds are unavailable.
  const result: TournamentResultBreakdown | undefined = ownRow ? {
    tournamentId, teamId: ownRow.teamId, placement: ownRow.placement, matches: ownRow.matches,
    wwcd: ownRow.wwcd, kills: ownRow.finishes, placementPoints: ownRow.placementPoints,
    killPoints: ownRow.finishPoints, penalties: ownRow.penalties, totalPoints: ownRow.totalPoints, maps: [],
  } : undefined;
  const explanation = session === undefined ? 'Hesab məlumatı yoxlanılır.' : !session ? 'Komanda nəticəsi üçün hesabınıza daxil olun.' : !team ? 'Hesabınıza bağlı komanda tapılmadı.' : !ownRow ? 'Komandanızın bu turnirdə dərc edilmiş nəticəsi yoxdur.' : 'Komandanızın rəsmi turnir nəticəsi.';
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'leaderboard' : event.key === 'End' ? (ownRow ? 'result' : 'leaderboard') : family === 'leaderboard' && ownRow ? 'result' : 'leaderboard';
    setSelected(next);
    event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-family="${next}"]`)?.focus();
  };
  return <Modal open={open} onClose={onClose} title="Nəticələri yüklə">
    <div className="results-download-options" role="radiogroup" aria-label="PNG növü">
      {(['leaderboard', 'result'] as const).map(option => <button key={option} type="button" role="radio" data-family={option} aria-checked={family === option} disabled={option === 'result' && !ownRow} aria-describedby={option === 'result' ? 'team-export-help' : undefined} tabIndex={family === option ? 0 : -1} onClick={() => setSelected(option)} onKeyDown={onKeyDown}>
        <span className={`results-download-preview results-download-preview--${option}`} aria-hidden="true">{option === 'leaderboard' ? <><i className="preview-heading" />{Array.from({ length: 4 }, (_, row) => <span key={row}>{Array.from({ length: 4 }, (_, col) => <i key={col} />)}</span>)}</> : <><i className="preview-logo" /><i className="preview-name" /><span className="preview-stats"><i /><i /><i /></span><i className="preview-tournament" /></>}</span>
        <strong>{option === 'leaderboard' ? 'Turnir cədvəli' : 'Komanda nəticəsi'}</strong>
      </button>)}
    </div>
    <p id="team-export-help" className="results-download-help">{explanation}</p>
    {open && <Suspense fallback={<p role="status">Yükləmə hazırlanır…</p>}><Generator key={`${tournamentId}:${family}:${team?.id ?? 'guest'}`} compactDownload downloadOnly initialFamily={family} initialLeaderboardLimit="all" showFamilySelector={false} teamName={team?.name ?? ''} teamLogo={team?.logoUrl} tournamentName={tournamentName ?? ''} tournamentId={tournamentId} result={result} standings={standings.map(row => ({ tournamentId: row.tournamentId, teamId: row.teamId, rank: row.placement, matches: row.matches, penalties: row.penalties, team: teams.find(item => item.id === row.teamId)?.name ?? 'Komanda adı dərc edilməyib', wwcd: row.wwcd, placementPoints: row.placementPoints, killPoints: row.finishPoints, totalPoints: row.totalPoints }))} provenance={publishedAt && tournamentName ? { tournamentId, occurredAt: publishedAt, stageLabel: 'Yekun sıralama', sourceLabel: 'Dərc edilmiş rəsmi nəticə' } : null} /></Suspense>}
  </Modal>;
}
