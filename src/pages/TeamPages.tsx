import { invalidateQuery, updateCachedQuery } from '../services/queryCache';
import { CareerNav, TeamWrappedEntry } from '../components/team/TeamCareerNav';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  History,
  KeyRound,
  LockKeyhole,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCcw,
  Settings,
  ShieldCheck,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';
import { lazy, Suspense, type FormEvent, type KeyboardEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { TeamComparison } from '../components/team/TeamExperience';
import {
  Button,
  FileUpload,
  ConfirmDialog,
  CopyButton,
  Countdown,
  DataTable,
  EmptyState,
  Input,
  MobileDataList,
  Modal,
  NotificationItem,
  PageHeader,
  SectionHeading,
  Select,
  StatusBadge,
  Switch,
  Tabs,
  TeamLogo,
  Textarea,
  Toast,
} from '../components/common/primitives';
import { competitionNow, services } from '../services';
import { useTeamCompetitionContexts, useTeamPlatformData } from '../services/PlatformDataContext';
import { deriveTournamentResultBreakdown } from '../utils/resultBreakdown';
import { publicTeamUrl } from '../utils/publicUrl';
import type { RoomCredentials, TeamProfileCardData, TeamPlatformSnapshot } from '../types/domain';

const LazyProfileCardGenerator = lazy(async () => ({ default: (await import('../components/profile/ProfileCardGenerator')).ProfileCardGenerator }));
const LazySharecardGenerator = lazy(async () => ({ default: (await import('../components/competition/SharecardGenerator')).SharecardGenerator }));

export { TeamOverview as TeamDashboardPage } from "../components/team/TeamOverview";

export function TeamTournamentsPage() {
  const { current, all } = useTeamCompetitionContexts();
  if (!all.length) return <><PageHeader eyebrow="Yarış qeydiyyatları" title="Turnirlərim" description="Komandanın aktiv və tamamlanmış turnirləri." /><EmptyState title="Turnir qeydiyyatı yoxdur" body="Komanda bir turnirə qoşulduqda əməliyyat xətti burada görünəcək." action={<Link className="button button--secondary" to="/tournaments"><span>Turnirləri kəşf et</span></Link>} /></>;
  const completed = all.filter((context) => context.lifecycle === 'completed');
  return <><PageHeader eyebrow="Yarış iştirakları" title="Turnirlərim" description="Cari qeydiyyat, slot, check-in və arxiv bir yarış xəttində." /><div className="team-tournament-list">{current && <article className="team-tournament-active"><div><StatusBadge status={current.participation.status === 'confirmed' ? 'approved' : 'warning'}>{current.participation.status === 'confirmed' ? 'İştirak təsdiqlənib' : 'İştirak yoxlanılır'}</StatusBadge><span>Cari yarış</span></div><h2>{current.tournament.name}</h2><div className="entry-facts"><span>Slot<strong>{current.participation.slotNumber ? `#${String(current.participation.slotNumber).padStart(2, '0')}` : 'Məlumat yoxdur'}</strong></span><span>Check-in<strong>{current.checkIn ? new Date(current.checkIn.opensAt).toLocaleString('az-AZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Məlumat yoxdur'}</strong></span><span>Növbəti matç<strong>{current.firstMatch ? `${current.firstMatch.map} · ${new Date(current.firstMatch.startsAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Baku' })}` : 'Plan yoxdur'}</strong></span><span>Otaq<strong>{current.room?.status === 'released' ? 'Hazırdır' : current.room?.status === 'locked' ? 'Bağlıdır' : 'Məlumat yoxdur'}</strong></span></div><Link className="button button--primary" to={`/team/tournaments/${current.tournament.id}`}><span>Turnir əməliyyatlarını aç</span><ArrowRight size={17} /></Link></article>}{all.filter(entry => entry !== current && entry.lifecycle !== 'completed').map(entry => <article className="team-tournament-history" key={entry.tournament.id}><span>{entry.participation.status}</span><h2>{entry.tournament.name}</h2><p>{entry.participation.groupLabel ?? 'Qrup gözlənilir'} · {entry.nextMatch?.map ?? 'Matç gözlənilir'}</p><Link to={`/team/tournaments/${entry.tournament.id}`}>Əməliyyatlar <ArrowRight size={16} /></Link></article>)}{completed.map((context) => { const points = context.history.reduce((total, match) => total + match.points, 0); const wwcd = context.history.filter((match) => match.wwcd).length; return <article className="team-tournament-history" key={context.tournament.id}><span>Tamamlanıb · {new Date(context.tournament.endsAt).getFullYear()}</span><h2>{context.tournament.name}</h2><div><strong>{context.participation.resultPlacement ? `#${String(context.participation.resultPlacement).padStart(2, '0')}` : '—'}</strong><span>Yekun yer</span><strong>{context.history.length ? points : '—'}</strong><span>Dərc edilmiş xal · {context.history.length} matç</span><strong>{context.history.length ? wwcd : '—'}</strong><span>WWCD</span></div><Link to={`/team/tournaments/${context.tournament.id}`}>Yarış tarixçəsi <ArrowRight size={16} /></Link></article>; })}</div></>;
}

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

export function TeamComparisonPage() {
  const { teamComparisonRecords } = useTeamPlatformData();
  return <><PageHeader eyebrow="Karyera müqayisəsi" title="Komandaları müqayisə et" description="Eyni dərc edilmiş rəsmi nəticələrdəki göstəriciləri yan-yana yoxlayın. Məlumat olmayan sahələr “—” ilə işarələnir." /><CareerNav /><TeamComparison records={teamComparisonRecords} /></>;
}

export function TeamRosterPage() {
  const {currentTeam}=useTeamPlatformData();
  const [selected,setSelected]=useState<number>(),[ign,setIgn]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const refresh=(team:typeof currentTeam)=>{updateCachedQuery<TeamPlatformSnapshot>('snapshot:team',v=>({...v,currentTeam:team}));invalidateQuery('snapshot:public');invalidateQuery('profile:');};
  const save=async()=>{if(!selected||busy)return;setBusy(true);setError('');try{refresh(await services.teams.updateRosterSlot(currentTeam.id,selected,ign));setSelected(undefined);setNotice('Oyunçu adı saxlanıldı.');}catch{setError('Dəyişiklik saxlanılmadı. Yenidən cəhd edin.');}finally{setBusy(false);}};
  const upload=async(file:File)=>{if(!selected||busy)return;setBusy(true);setError('');try{await services.media.uploadPlayerPhoto(currentTeam.id,selected,file);refresh(await services.teams.current());setNotice('Oyunçu şəkli saxlanıldı.');}catch{setError('Şəkil yüklənmədi. Formatı, ölçünü və bağlantını yoxlayın.');}finally{setBusy(false);}};
  return <><PageHeader eyebrow="Heyət nəzarəti" title="Heyət" description="Komandanın beş oyunçu yeri, oyunçu adları və şəkilləri." />{notice&&<Toast title={notice} />}<section className="roster-group"><h2>OYUNÇULAR</h2><div className="roster-management">{[1,2,3,4,5].map(slot=>{const player=currentTeam.roster.find(p=>p.id===`${currentTeam.id}:player${slot}`);return <article key={slot}><span className="roster-number">{String(slot).padStart(2,'0')}</span><TeamLogo name={player?.ign||'Oyunçu'} src={player?.photoUrl} /><div><strong>{player?.ign||'Boş yer'}</strong><span>{slot===5?'Ehtiyat oyunçu':'Əsas heyət'}</span></div><Button variant="ghost" icon={<Pencil size={16}/>} onClick={()=>{setSelected(slot);setIgn(player?.ign||'');setError('');}}>Dəyiş</Button></article>;})}</div></section><Modal open={selected!==undefined} title={`Oyunçu ${selected??''}`} onClose={()=>{if(!busy)setSelected(undefined);}} footer={<Button loading={busy} disabled={selected!==5&&ign.trim().length<2} onClick={()=>void save()}>Saxla</Button>}><div className="modal-form">{error&&<p role="alert" className="field__error">{error}</p>}<Input label="Oyunçu IGN" maxLength={40} value={ign} disabled={busy} onChange={e=>setIgn(e.target.value)} /><FileUpload label="Oyunçu şəkli" accept={['image/png','image/jpeg','image/webp']} maxBytes={4_000_000} disabled={busy} hint="PNG, JPG, WebP · 4 MB · Şəklin nisbəti saxlanılır" onFile={file=>void upload(file)} /></div></Modal></>;
}

export function TeamMessagesPage() {
  const { adminMessages } = useTeamPlatformData();
  const [filter, setFilter] = useState('all');
  return <><PageHeader eyebrow="Rəsmi elanlar" title="Mesajlar" description="Bu bölmə admin-komanda elanları üçündür; söhbət funksiyası deyil." /><Tabs active={filter} onChange={setFilter} items={[{ id: 'all', label: 'Hamısı', count: adminMessages.length }, { id: 'unread', label: 'Oxunmamış', count: adminMessages.filter((item) => !item.read).length }, { id: 'important', label: 'Vacib' }]} /><div className="inbox-layout"><div className="inbox-list">{adminMessages.filter((item) => filter === 'all' || (filter === 'unread' && !item.read) || (filter === 'important' && item.severity === 'critical')).map((message) => <NotificationItem key={message.id} item={message} />)}</div><aside><Bell size={22} /><h2>Bildiriş kanalları</h2><p>Tətbiqdaxili bildiriş aktivdir. Email və push çatdırılması provayder inteqrasiyasından sonra işləyəcək.</p><Link to="/team/settings">Tərcihlər <ArrowRight size={16} /></Link></aside></div></>;
}

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
