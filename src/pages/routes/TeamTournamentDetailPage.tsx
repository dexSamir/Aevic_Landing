import {
AlertTriangle,
ArrowRight,
Check,
CheckCircle2,
Clock3,
KeyRound,
Swords
} from 'lucide-react';
import { useEffect,useState } from 'react';
import { Link,useParams } from 'react-router-dom';
import {
Button,
ConfirmDialog,
CopyButton,
Countdown,
EmptyState,
PageHeader,
SectionHeading,
StatusBadge
} from '../../components/common/primitives';
import { services } from '../../services';
import { useTeamCompetitionContexts,useTeamPlatformData } from '../../services/PlatformDataContext';
import { updateCachedQuery } from '../../services/queryCache';
import type { RoomCredentials,TeamPlatformSnapshot } from '../../types/domain';

export function TeamTournamentDetailPage() {
  const { currentTeam } = useTeamPlatformData();
  const { byTournamentId } = useTeamCompetitionContexts();
  const { tournamentId } = useParams();
  const context = tournamentId ? byTournamentId.get(tournamentId) : undefined;
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [withdrawn, setWithdrawn] = useState(false);
  const [room, setRoom] = useState<RoomCredentials>();
  const [roomLoading, setRoomLoading] = useState(false);
  const [roomError, setRoomError] = useState('');
  const [revealed, setRevealed] = useState(false);
  useEffect(() => { setRoom(undefined); setRevealed(false); setRoomError(''); setWithdrawn(false); setCheckedIn(false); setCheckInOpen(false); }, [tournamentId, context?.room?.roundId]);
  useEffect(() => {
    if (window.location.hash !== '#room') return;
    const frame = window.requestAnimationFrame(() => {
      const panel = document.querySelector<HTMLElement>('.tournament-operations-console .credential-panel');
      panel?.setAttribute('id', 'room');
      panel?.scrollIntoView({ block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [tournamentId]);
  const loadRoom = async () => { const roundId=context?.room?.roundId ?? context?.nextMatch?.id; if (!roundId || !context) { setRoomError('Otaq raundu haqqında məlumat yoxdur.'); return; } setRoomLoading(true); setRoomError(''); try { setRoom(await services.rooms.getForEligibleTeam(context.tournament.id, roundId)); } catch { setRoomError('Otaq məlumatı açılmadı. Uyğunluğu və açılma vaxtını yoxlayın.'); } finally { setRoomLoading(false); } };
  if (!context) return <><PageHeader eyebrow="Turnir əməliyyatları" title="Turnir tapılmadı" /><EmptyState title="Etibarsız turnir seçimi" body="Komandanın bu turnirdə iştirak qeydi yoxdur." action={<Link className="button button--secondary" to="/team/tournaments"><span>Turnirlərimə qayıt</span></Link>} /></>;
  const { tournament: activeTournament, participation, matches: tournamentMatches } = context;
  const roomAvailability = withdrawn || context.participation.status === 'withdrawn' ? undefined : room ?? context.room;
  const roomReleaseAt = roomAvailability?.releaseAt;
  const roomMatch = tournamentMatches.find((match) => match.id === roomAvailability?.roundId) ?? context.firstMatch;
  const participationMeta = [participation.groupLabel, participation.slotNumber ? `Slot #${String(participation.slotNumber).padStart(2, '0')}` : undefined, `${tournamentMatches.length} raund`].filter(Boolean).join(' · ');
  const uniqueMaps = [...new Set(tournamentMatches.map((match) => match.map))];
  return <><PageHeader eyebrow="Turnir əməliyyatları" title={activeTournament.name} description="Bu günün iştirak, vaxt və otaq xətti." actions={<><Link className="button button--secondary" to={`/tournaments/${activeTournament.id}`}><span>Public turnir</span></Link>{tournamentMatches[0] && <Link className="button button--secondary" to={`/tournaments/${activeTournament.id}#matches`} state={{ roundId: tournamentMatches[0].id }}><span>İlk raund</span><ArrowRight size={16} /></Link>}</>} />
    <section className="tournament-operation-identity" aria-label="Turnir iştirak məlumatı"><div><span>İŞTİRAK</span><h2>{withdrawn ? 'İştirak dayandırılıb' : participation.status === 'confirmed' ? 'Komandanız təsdiqlənib' : 'İştirak yoxlanılır'}</h2><p>{participationMeta}</p></div><StatusBadge status={withdrawn ? 'rejected' : participation.status === 'confirmed' ? 'approved' : 'warning'}>{withdrawn ? 'Geri çəkilib' : participation.status === 'confirmed' ? 'Qeydiyyat tamamdır' : 'Yoxlanılır'}</StatusBadge><dl><div><dt>Check-in</dt><dd>{context.checkIn ? `${new Date(context.checkIn.opensAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Baku' })} — ${new Date(context.checkIn.closesAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Baku' })}` : 'Məlumat yoxdur'}</dd></div><div><dt>İlk xəritə</dt><dd>{context.firstMatch?.map ?? 'Məlumat yoxdur'}</dd></div></dl></section>
    {context.checkIn && <section className="tournament-check-in" aria-label="Check-in əməliyyatı"><div><span>CHECK-IN</span><strong>{checkedIn || context.checkIn.status === 'checked-in' ? 'Check-in tamamlandı' : context.checkIn.status === 'open' ? 'İştirakınızı indi təsdiqləyin' : context.checkIn.status === 'missed' ? 'Check-in pəncərəsi bağlanıb' : 'Check-in pəncərəsi gözlənilir'}</strong></div>{!withdrawn && participation.status !== 'withdrawn' && !checkedIn && context.checkIn.status === 'open' && <Button onClick={() => setCheckInOpen(true)}>Check-in et</Button>}</section>}
    <ConfirmDialog open={checkInOpen} title="Check-in-i təsdiqlə" body={`${currentTeam.name} komandasının iştirak etməyə hazır olduğunu təsdiqləyirsiniz.`} confirmLabel="Bəli, hazırıq" tone="primary" onClose={() => setCheckInOpen(false)} onConfirm={async () => { const checkIn = await services.teams.checkIn(activeTournament.id); updateCachedQuery<TeamPlatformSnapshot>('snapshot:team', value => ({ ...value, checkIn })); setCheckedIn(true); setCheckInOpen(false); }} />
    <div className="tournament-operations-console"><section id="room" className={`credential-panel ${roomAvailability?.status === 'released' ? 'credential-panel--released' : ''}`}><div className="credential-panel__lock"><KeyRound size={24} /><StatusBadge status={roomAvailability?.status === 'released' ? 'released' : 'locked'}>{roomAvailability?.status === 'released' ? 'Otaq hazırdır' : roomAvailability ? 'Bağlıdır' : 'Məlumat yoxdur'}</StatusBadge></div><div><span className="credential-panel__eyebrow">OTAQ GİRİŞİ</span><h2>{roomAvailability?.status === 'released' ? `Raund ${String(roomMatch?.round ?? '').padStart(2, '0')} məlumatları` : roomReleaseAt ? `${new Date(roomReleaseAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Baku' })}-də açılacaq` : 'Otaq vaxtı paylaşılmayıb'}</h2><p>{roomMatch ? `${roomMatch.map} · Raund ${roomMatch.round}. ` : ''}Yalnız bu turnir üçün uyğun komanda hesabında görünür.</p></div>{roomError && <p className="field__error" role="alert">{roomError}</p>}{roomAvailability && !room && <Button loading={roomLoading} disabled={withdrawn || participation.status === 'withdrawn'} onClick={() => void loadRoom()}>Otaq statusunu yoxla</Button>}{roomAvailability?.status === 'locked' && <div className="credential-panel__release"><span>Açılmağa qalan vaxt</span><Countdown target={roomAvailability.releaseAt} compact /></div>}{room?.status === 'released' && <><div className="credential-placeholder"><span>Otaq ID-si<strong>{room.roomId ?? 'Məlumat yoxdur'}</strong></span>{room.roomId && <CopyButton value={room.roomId} />}</div><div className="credential-placeholder"><span>Şifrə<strong>{room.password ? revealed ? room.password : '••••••••' : 'Məlumat yoxdur'}</strong></span>{room.password && <div><Button variant="ghost" onClick={() => setRevealed((value) => !value)}>{revealed ? 'Gizlət' : 'Göstər'}</Button><CopyButton value={room.password} /></div>}</div><small>Bu məlumatları yalnız komanda heyəti ilə paylaşın.</small></>}</section><section className="tournament-briefing"><SectionHeading title="Kapitan qeydləri" /><div><CheckCircle2 size={18} /><span><strong>Heyət vəziyyəti</strong><small>{currentTeam.roster.length} oyunçu qeydiyyatdadır</small></span></div><div><Clock3 size={18} /><span><strong>İlk raund</strong><small>{context.firstMatch ? new Date(context.firstMatch.startsAt).toLocaleString('az-AZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Məlumat yoxdur'}</small></span></div><div><Swords size={18} /><span><strong>{tournamentMatches.length} raund · {uniqueMaps.length} xəritə</strong><small>{uniqueMaps.length ? uniqueMaps.join(', ') : 'Raund proqramı yoxdur'}</small></span></div></section></div>
    <section className="operational-timeline" aria-labelledby="operational-timeline-title"><header><span>YARIŞ PROQRAMI</span><h2 id="operational-timeline-title">Əməliyyat vaxt xətti</h2><small>Vaxtlar Bakı vaxtı ilə</small></header><ol>{context.checkIn && <li className={context.checkIn.status === 'checked-in' ? 'is-complete' : ''}><span><Check size={16} /></span><time dateTime={context.checkIn.opensAt}>{new Date(context.checkIn.opensAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Baku' })}</time><div><strong>Check-in</strong><small>Komanda hazırlığının təsdiqi</small></div></li>}{roomReleaseAt && <li><span><KeyRound size={16} /></span><time dateTime={roomReleaseAt}>{new Date(roomReleaseAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Baku' })}</time><div><strong>Otaq məlumatları</strong><small>Uyğun komandalar üçün açılır</small></div></li>}{tournamentMatches.map((match) => <li key={match.id}><span>R{match.round}</span><time dateTime={match.startsAt}>{new Date(match.startsAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Baku' })}</time><div><strong>{match.map}</strong><small>{match.lobby} · {match.stage === 'final' ? 'Final' : 'Qrup mərhələsi'}</small></div><StatusBadge status={match.status === 'live' ? 'open' : match.status === 'completed' ? 'approved' : 'warning'}>{match.status === 'live' ? 'Canlı' : match.status === 'completed' ? 'Bitib' : 'Planlanıb'}</StatusBadge></li>)}</ol></section>
    <section className="danger-zone"><AlertTriangle size={21} /><div><h2>Turnirdən geri çəkilmək</h2><p>İştirak dayandırılır və komanda bu turnirin matçlarına daxil ola bilmir.</p></div><Button variant="danger" disabled={withdrawn} onClick={() => setWithdrawOpen(true)}>{withdrawn ? 'Geri çəkilib' : 'Turnirdən çıx'}</Button></section><ConfirmDialog open={withdrawOpen} title="Turnirdən geri çəkilirsiniz?" body={`${currentTeam.name} komandası ${activeTournament.name} turnirindəki ${participation.slotNumber ? `#${String(participation.slotNumber).padStart(2, '0')} slotunu` : 'iştirakını'} dayandıracaq. Bu əməliyyat admin panelində görünəcək və avtomatik geri qaytarılmaya bilər.`} confirmLabel="Bəli, geri çəkil" onClose={() => setWithdrawOpen(false)} onConfirm={async () => { await services.teams.withdraw(activeTournament.id, 'Captain requested'); updateCachedQuery<TeamPlatformSnapshot>('snapshot:team', value => ({ ...value, participations: value.participations.map(entry => entry.tournamentId === activeTournament.id ? { ...entry, status: 'withdrawn' } : entry) })); setRoom(undefined); setRevealed(false); setWithdrawn(true); setWithdrawOpen(false); }} /></>;
}
