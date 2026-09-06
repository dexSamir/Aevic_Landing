import { Check, CheckCircle2, LoaderCircle, LockKeyhole, ShieldAlert, UserPlus, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { competitionNow, serviceCapabilities, services } from '../../services';
import { ApiError } from '../../services/apiError';
import { invalidateQuery } from '../../services/queryCache';
import type { Team, Tournament, TournamentCalendarParticipation, TournamentJoinFailureCode } from '../../types/domain';
import { formatEventTime } from '../../utils/calendar';
import { resolveTournamentJoinState } from '../../utils/tournamentJoin';
import { Button, Modal } from '../common/primitives';
import './competition-schedule.css';

const failureCodes = new Set<TournamentJoinFailureCode>(['ALREADY_REGISTERED', 'FULL', 'REGISTRATION_CLOSED', 'INELIGIBLE', 'ROSTER_INCOMPLETE', 'PLAYER_CONFLICT', 'UNAUTHORIZED', 'UNKNOWN']);

function normalizeFailure(error: unknown): { code: TournamentJoinFailureCode; message: string } {
  if (error instanceof ApiError) {
    const code = failureCodes.has(error.code as TournamentJoinFailureCode) ? error.code as TournamentJoinFailureCode : error.kind === 'conflict' ? 'ALREADY_REGISTERED' : error.kind === 'unauthorized' ? 'UNAUTHORIZED' : 'UNKNOWN';
    return { code, message: error.message };
  }
  return { code: 'UNKNOWN', message: 'Qeydiyyat tamamlanmadı. Bağlantını yoxlayıb yenidən cəhd edin.' };
}

export function TournamentJoinAction({ tournament, showTeamState = false, onStateChange, onJoined }: {
  tournament: Tournament;
  showTeamState?: boolean;
  onStateChange?: (participation: TournamentCalendarParticipation | 'pending' | undefined, team?: Team) => void;
  onJoined?: () => void;
}) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [team, setTeam] = useState<Team>();
  const [participation, setParticipation] = useState<TournamentCalendarParticipation | 'pending'>();
  const [registering, setRegistering] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [failure, setFailure] = useState<{ code: TournamentJoinFailureCode; message: string }>();
  const [success, setSuccess] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    if (!serviceCapabilities.publicSession) { setChecking(false); return; }
    setChecking(true); setFailure(undefined); setSuccess(''); setParticipation(undefined); setTeam(undefined);
    void services.auth.getSession().then(async (session) => {
      if (!active) return;
      if (!session || !['captain', 'team', 'admin'].includes(session.role)) { setAuthenticated(false); return; }
      setAuthenticated(true);
      const currentTeam = await services.teams.current();
      if (!active) return;
      setTeam(currentTeam);
      if (!currentTeam) return;
      const tournamentSlots = await services.tournaments.slots(tournament.id);
      if (!active) return;
      const registered = tournamentSlots.some((slot) => slot.teamId === currentTeam.id);
      const nextParticipation = registered ? 'registered' as const : undefined;
      setParticipation(nextParticipation);
      onStateChange?.(nextParticipation, currentTeam);
    }).catch((error) => { if (active) setFailure(normalizeFailure(error)); }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [attempt, tournament.id]);

  const state = resolveTournamentJoinState({ checking, authenticated, team, tournament, participation, registering, failureCode: failure?.code, now: competitionNow() });
  const dateLabel = useMemo(() => new Date(tournament.startsAt).toLocaleDateString('az-AZ', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Baku' }), [tournament.startsAt]);

  const join = async () => {
    if (!team || registering || !serviceCapabilities.teamWorkspace) return;
    setRegistering(true); setFailure(undefined); setSuccess('');
    try {
      const result = await services.tournaments.join(tournament.id, team.id);
      if (!result.ok) {
        const nextFailure = { code: result.reasonCode ?? 'UNKNOWN' as TournamentJoinFailureCode, message: result.reason ?? 'Turnir qeydiyyatı tamamlanmadı.' };
        if (nextFailure.code === 'ALREADY_REGISTERED') {
          setParticipation('registered');
          setConfirmOpen(false);
          setSuccess(`✓ ${team.name} qeydiyyatdan keçib.`);
          onStateChange?.('registered', team);
          return;
        }
        setFailure(nextFailure);
        if (nextFailure.code === 'ROSTER_INCOMPLETE') setConfirmOpen(false);
        return;
      }
      const nextParticipation = result.status ?? 'registered';
      setParticipation(nextParticipation);
      setConfirmOpen(false);
      setSuccess(`✓ ${team.name} qeydiyyatdan keçdi.`);
      invalidateQuery('snapshot:');
      onStateChange?.(nextParticipation, team);
      if (!result.duplicate) onJoined?.();
    } catch (error) {
      const nextFailure = normalizeFailure(error);
      if (nextFailure.code === 'ALREADY_REGISTERED') {
        setParticipation('registered');
        setConfirmOpen(false);
        setSuccess(`✓ ${team.name} qeydiyyatdan keçib.`);
        onStateChange?.('registered', team);
      } else setFailure(nextFailure);
    } finally {
      setRegistering(false);
    }
  };

  const action = (() => {
    if (!serviceCapabilities.teamWorkspace) return <Button variant="secondary" disabled>Turnir qeydiyyatı hələ əlçatan deyil</Button>;
    if (state === 'login') return <Link className="button button--primary" to={`/login?returnTo=${encodeURIComponent(`/tournaments/${tournament.id}`)}`}><UserPlus size={17} /><span>Daxil ol və qoşul</span></Link>;
    if (state === 'create-team') return <Link className="button button--primary" to="/register"><Users size={17} /><span>Komanda yarat</span></Link>;
    if (state === 'roster-incomplete') return <Link className="button button--secondary" to="/team/roster"><ShieldAlert size={17} /><span>Heyəti tamamla</span></Link>;
    if (state === 'join') return <Button icon={<Check size={17} />} onClick={() => setConfirmOpen(true)}>Turnirə qoşul</Button>;
    if (state === 'registering') return <Button loading disabled>Qeydiyyat göndərilir</Button>;
    if (state === 'registered') return <Button variant="secondary" disabled icon={<CheckCircle2 size={17} />}>Qeydiyyatdan keçib</Button>;
    if (state === 'approved') return <Button variant="secondary" disabled icon={<CheckCircle2 size={17} />}>Təsdiqlənib</Button>;
    if (state === 'pending') return <Button variant="secondary" disabled icon={<LoaderCircle size={17} />}>Yoxlanılır</Button>;
    if (state === 'full') return <Button variant="secondary" disabled icon={<Users size={17} />}>Slot yoxdur</Button>;
    if (state === 'closed') return <Button variant="secondary" disabled icon={<LockKeyhole size={17} />}>Qeydiyyat bağlanıb</Button>;
    if (state === 'ineligible') return <Button variant="secondary" disabled icon={<ShieldAlert size={17} />}>Komanda uyğun deyil</Button>;
    if (state === 'error') return <Button variant="secondary" onClick={() => setAttempt((value) => value + 1)}>Yenidən yoxla</Button>;
    return <Button variant="secondary" disabled loading>Status yoxlanılır</Button>;
  })();

  return <div className="tournament-join" id="tournament-join">
    {showTeamState && team && <div className="calendar-team-state"><span>Sizin komanda</span><strong>{team.name}</strong><small>{participation ? state === 'approved' ? 'Təsdiqlənmiş iştirak' : state === 'pending' ? 'Qeydiyyat yoxlanılır' : 'Qeydiyyat tapıldı' : state === 'roster-incomplete' ? 'Heyət tamamlanmalıdır' : state === 'ineligible' ? 'Komanda təsdiqi tələb olunur' : 'Turnir qeydiyyatı yoxdur'}</small></div>}
    <div className="tournament-join__action">{action}</div>
    {state === 'roster-incomplete' && <p className="tournament-join__message">Qeydiyyatı tamamlamazdan əvvəl heyətinizi tamamlayın.</p>}
    {state === 'ineligible' && <p className="tournament-join__message">Yalnız təsdiqlənmiş komandalar bu turnirə qoşula bilər.</p>}
    {failure && state === 'error' && <p className="tournament-join__message tournament-join__message--error" role="alert">{failure.message}</p>}
    <p className="sr-only" aria-live="polite">{success}</p>
    <Modal open={confirmOpen} title={tournament.name} onClose={() => { if (!registering) setConfirmOpen(false); }} footer={<><Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={registering}>Ləğv et</Button><Button data-autofocus="true" loading={registering} onClick={() => void join()}>Turnirə qoşul</Button></>}>
      <div className="tournament-join-confirm"><p><strong>{team?.name}</strong> ilə turnirə qoşulursunuz.</p><dl><div><dt>Raund</dt><dd>{tournament.roundsPerDay * tournament.days}</dd></div><div><dt>Tarix</dt><dd>{dateLabel}</dd></div><div><dt>Saat</dt><dd>{formatEventTime(tournament.startsAt)} AZT</dd></div></dl>{failure && <p className="tournament-join__message tournament-join__message--error" role="alert">{failure.message}</p>}</div>
    </Modal>
  </div>;
}
