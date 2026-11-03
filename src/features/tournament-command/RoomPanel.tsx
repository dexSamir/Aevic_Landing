import { LockKeyhole } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button, CopyButton } from '../../components/common/primitives';
import { services } from '../../services';
import { ApiError } from '../../services/apiError';
import type { MatchScheduleItem, RoomCredentials } from '../../types/domain';
import { eventTime } from './model';

type Props = { tournamentId: string; match?: MatchScheduleItem; eligible: boolean; terminal: boolean; hint?: string; onVerified: (roundId: string, status?: RoomCredentials['status']) => void };
/** Mounted with an identity/round key. Secrets never enter the shared query cache. */
export function RoomPanel({ tournamentId, match, eligible, terminal, hint, onVerified }: Props) {
  const [room, setRoom] = useState<RoomCredentials>();
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | undefined>(undefined);
  const canRead = eligible && !terminal && Boolean(match && match.status !== 'completed');
  const clear = () => { request.current?.abort(); setRoom(undefined); setRevealed(false); setLoading(false); if (match) onVerified(match.id); };
  useEffect(() => {
    const hide = () => { if (document.hidden) clear(); };
    window.addEventListener('aevic:session-change', clear);
    window.addEventListener('pagehide', clear);
    document.addEventListener('visibilitychange', hide);
    return () => { request.current?.abort(); window.removeEventListener('aevic:session-change', clear); window.removeEventListener('pagehide', clear); document.removeEventListener('visibilitychange', hide); };
    // Identity and eligibility changes remount this component; callbacks need no subscription churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!room) return;
    // A short in-memory lease also closes access when a snapshot/session refresh is unavailable.
    const timer = window.setTimeout(clear, 60_000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);
  const load = async () => {
    if (!canRead || !match) return;
    clear(); const controller = new AbortController(); request.current = controller;
    setLoading(true); setError('');
    try {
      const result = await services.rooms.getForEligibleTeam(tournamentId, match.id, controller.signal);
      if (controller.signal.aborted) return;
      if (result.roundId !== match.id) throw new Error('Unexpected round');
      setRoom(result); onVerified(match.id, result.status);
    } catch (failure) {
      if (controller.signal.aborted) return;
      setError(failure instanceof ApiError && failure.status === 401 ? 'Sessiyanın vaxtı bitib. Yenidən daxil olun.' : failure instanceof ApiError && failure.status === 403 ? 'Otağa giriş təsdiqlənmədi. İştirak və Check-in vəziyyətini yoxlayın.' : 'Otaq məlumatı yüklənmədi. Yenidən yoxlayın.');
    } finally { if (!controller.signal.aborted) setLoading(false); }
  };
  const status = terminal ? 'Otaq girişi bağlanıb' : !match ? 'Raund planlaşdırılmayıb' : match.status === 'completed' || room?.status === 'expired' ? 'Bu raundun otağı bağlanıb' : !eligible ? 'İştirak təsdiqi və Check-in tələb olunur' : room?.status === 'released' ? 'Otaq hazırdır' : room?.reason === 'not-configured' ? 'Admin otaq məlumatlarını hələ daxil etməyib' : room?.reason === 'not-scheduled' ? 'Otağın açılma vaxtı paylaşılmayıb' : room?.status === 'locked' ? 'Otaq hələ açılmayıb' : 'Otaq statusunu serverdə yoxlayın';
  return <div className="command-room-body">
    <div className="command-room-message"><LockKeyhole aria-hidden="true" /><div><p role="status">{status}</p><p className="command-muted">{room?.status === 'released' ? 'Məlumatları yalnız komandanızla paylaşın.' : 'Otaq məlumatları təhlükəsizlik məqsədilə gizlidir.'}</p></div></div>
    <p className="command-muted">{match ? `${match.map} · Raund ${match.round}` : 'Yarış proqramı gözlənilir'}<br />Açılma vaxtı: {eventTime(room?.releaseAt || match?.roomReleaseAt || hint)}</p>
    {error && <p role="alert" className="field__error">{error}</p>}
    {canRead && <Button loading={loading} onClick={() => void load()}>Otaq statusunu yoxla</Button>}
    {canRead && room?.status === 'released' && <>
      <div className="credential-placeholder"><span>Room ID<strong>{room.roomId ?? 'Məlumat yoxdur'}</strong></span>{room.roomId && <CopyButton value={room.roomId} />}</div>
      <div className="credential-placeholder"><span>Şifrə<strong>{room.password ? revealed ? room.password : '••••••••' : 'Məlumat yoxdur'}</strong></span>{room.password && <div><Button variant="ghost" onClick={() => setRevealed(v => !v)} aria-pressed={revealed}>{revealed ? 'Gizlət' : 'Göstər'}</Button><CopyButton value={room.password} /></div>}</div>
      <small>Məlumatları yalnız komanda heyəti ilə paylaşın. Təhlükəsizlik üçün bir dəqiqədən sonra yenidən yoxlama tələb olunur.</small>
    </>}
  </div>;
}
