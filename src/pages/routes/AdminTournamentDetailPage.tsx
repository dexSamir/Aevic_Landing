import { ArrowLeft, ArrowRight, ClipboardCheck, MoreHorizontal, Plus, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link,useParams } from 'react-router-dom';
import { Button,EmptyState,Input,Modal,PageHeader,ProgressBar,Select,StatusBadge,Textarea } from '../../components/common/primitives';
import { useAdminPlatformData } from '../../services/PlatformDataContext';
import { services } from '../../services';
import { invalidateQuery, usePlatformQuery } from '../../services/queryCache';
import { selectAdminOperations } from '../../utils/adminOperations';
import { formatEventDate } from '../../utils/calendar';
import { tournamentById } from '../../utils/routes';
import { AdminPanel } from '../../components/admin/AdminPrimitives';
import { statusLabel } from '../../utils/statusLabels';
import { TournamentEditForm,TournamentOperations } from '../AdminCompetitionForms';

export function AdminTournamentDetailPage() {
  const snapshot=useAdminPlatformData(),{tournamentId}=useParams();
  const tournament=tournamentById(snapshot.tournaments,tournamentId);
  const [query,setQuery]=useState(''),[filter,setFilter]=useState('all');
  const [action,setAction]=useState<'slot'|'check'>(),[teamId,setTeamId]=useState(''),[slot,setSlot]=useState(1);
  const [revision,setRevision]=useState(0);
  const [view,setView]=useState('overview');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const roomQuery=usePlatformQuery({key:`tournament:${tournamentId}:room-readiness`,query:signal=>services.tournaments.roomReadiness(tournamentId!,signal),enabled:view==='rooms'&&Boolean(tournamentId)});
  if(!tournament)return <><PageHeader eyebrow="Slot və check-in əməliyyatları" title="Turnir tapılmadı"/><EmptyState title="Yanlış turnir ünvanı" body="Siyahıdan etibarlı turnir seçin." action={<Link to="/admin/tournaments">Turnir siyahısına qayıt</Link>}/></>;
  const {slots,capacity}=selectAdminOperations(snapshot,tournament);
  const terminal=['completed','cancelled'].includes(tournament.status);
  const assignmentClosed=terminal||tournament.status==='ongoing'||Date.now()>=Date.parse(tournament.startsAt);
  const confirmed=slots.flatMap(s=>s.state==='occupied'&&s.teamId?[s.teamId]:[]);
  const teams=snapshot.teams.filter(t=>action==='check'?confirmed.includes(t.id):t.approvalStatus==='approved');
  const visible=slots.filter(s=>(filter==='all'||s.state===filter)&&`${s.number} ${snapshot.teams.find(t=>t.id===s.teamId)?.name??''}`.toLocaleLowerCase('az').includes(query.toLocaleLowerCase('az')));
  const checked=(id:string)=>snapshot.checkIns?.some(c=>c.tournamentId===tournament.id&&c.teamId===id&&c.status==='checked-in')??false;
  const open=(kind:'slot'|'check',number=1,id='')=>{setAction(kind);setSlot(number);setTeamId(id);setError('');};
  const save=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();if(busy||!action)return;setBusy(true);setError('');const data=new FormData(e.currentTarget),reason=String(data.get('reason')??'');
    try{
      if(action==='slot')await services.tournaments.assignSlot(tournament.id,{teamId,slotNumber:slot,expectedSlotNumber:slots.find(s=>s.teamId===teamId&&s.state==='occupied')?.number??null,reason},crypto.randomUUID());
      else await services.tournaments.correctCheckIn(tournament.id,{teamId,checkedIn:data.get('checkedIn')==='true',expectedCheckedIn:checked(teamId),reason},crypto.randomUUID());
      invalidateQuery('snapshot:admin');invalidateQuery('snapshot:public');setRevision(n=>n+1);setAction(undefined);setNotice('Dəyişiklik saxlanıldı və komandaya bildiriş göndərildi.');
    }catch{setError('Dəyişiklik saxlanılmadı. Slot, qeydiyyat və ya turnir statusu dəyişmiş ola bilər. Məlumatı yeniləyib yenidən cəhd edin.');}
    finally{setBusy(false);}
  };
  const rounds=(snapshot.matchSchedule??[]).filter(m=>m.tournamentId===tournament.id).sort((a,b)=>a.round-b.round);
  const published=snapshot.publishedRoundIds?.[tournament.id];
  const checkCount=snapshot.checkIns?.filter(c=>c.tournamentId===tournament.id&&c.status==='checked-in').length;
  return <><Link className="admin-back-link" to="/admin/tournaments"><ArrowLeft size={15}/>Turnirlərə qayıt</Link><PageHeader eyebrow="Turnir idarəetməsi" title={tournament.name} description={`${statusLabel(tournament.status)} · ${formatEventDate(tournament.startsAt,{withTime:true})} AZT`} actions={<><Button disabled={terminal||!confirmed.length} variant="secondary" icon={<ClipboardCheck size={17}/>} onClick={()=>open('check')}>Check-in düzəlişi</Button><Button disabled={assignmentClosed} icon={<Plus size={17}/>} onClick={()=>open('slot')}>Komanda təyin et</Button></>}/>
  {notice&&<p className="admin-notice" role="status">{notice}</p>}
  <section className="admin-command-facts" aria-label="Turnir əməliyyat göstəriciləri"><div><span>Qeydiyyat tutumu</span><strong>{capacity.occupied} / {capacity.total}</strong><ProgressBar value={capacity.occupied} max={capacity.total}/></div><div><span>Check-in tamamdır</span><strong>{checkCount??'—'} / {capacity.occupied}</strong></div><div><span>Raund cədvəli</span><strong>{rounds.length}</strong></div><div><span>Dərc edilmiş raundlar</span><strong>{published?.length??'—'} / {rounds.length}</strong></div></section>
  <div className="admin-detail-tabbar" role="group" aria-label="Turnir bölmələri">{[['overview','İcmal'],['slots','Slotlar və check-in'],['registrations','Qeydiyyatlar'],['rooms','Matç otaqları'],['settings','Konfiqurasiya']].map(([id,label])=><button type="button" key={id} aria-pressed={view===id} onClick={()=>setView(id)}>{label}</button>)}</div>
  <div hidden={view!=='overview'} className="admin-detail-overview"><AdminPanel title="Raund cədvəli" action={<Link to={`/admin/results?tournament=${tournament.id}`}>Nəticələri idarə et <ArrowRight size={14}/></Link>}><ol className="admin-schedule-list">{rounds.map(m=><li key={m.id}><span>{String(m.round).padStart(2,'0')}</span><div><strong>{m.map}</strong><small>{formatEventDate(m.startsAt,{withTime:true})} AZT</small></div><StatusBadge status={published?.includes(m.id)?'completed':'draft'}>{published?.includes(m.id)?'Dərc edilib':'Gözləyir'}</StatusBadge></li>)}</ol>{!rounds.length&&<p className="admin-inline-empty">Raund cədvəli yoxdur.</p>}</AdminPanel><AdminPanel title="Yarış məlumatları"><dl className="admin-detail-facts"><div><dt>Qeydiyyat açılır</dt><dd>{formatEventDate(tournament.registrationOpensAt,{withTime:true})}</dd></div><div><dt>Qeydiyyat bağlanır</dt><dd>{formatEventDate(tournament.registrationDeadline,{withTime:true})}</dd></div><div><dt>Check-in</dt><dd>{formatEventDate(tournament.checkInOpensAt,{withTime:true})}</dd></div><div><dt>Check-in bağlanır</dt><dd>{formatEventDate(tournament.checkInClosesAt,{withTime:true})}</dd></div><div><dt>Turnir bitir</dt><dd>{formatEventDate(tournament.endsAt,{withTime:true})}</dd></div><div><dt>Eliminasiya xalı</dt><dd>{tournament.pointFormula.finishPointValue}</dd></div><div><dt>Xal preseti</dt><dd>{tournament.pointFormula.presetId??'Tarixi formula'}</dd></div></dl><div className="admin-queue-links"><button type="button" className="button button--secondary" onClick={()=>setView('rooms')}>Matç otaqlarını qur</button></div></AdminPanel></div>
  <div hidden={view!=='slots'}>
  <section className="slot-admin-summary"><div><span>Dolu</span><strong>{capacity.occupied}</strong></div><div><span>Boş</span><strong>{capacity.available}</strong></div><div><span>Rezerv</span><strong>{capacity.reserved}</strong></div><div><span>Cəmi</span><strong>{capacity.total}</strong></div><ProgressBar value={capacity.occupied+capacity.reserved} max={capacity.total}/></section>
  <div className="admin-toolbar"><div className="search-field"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} aria-label="Komanda və slot axtar" placeholder="Komanda və ya slot axtar"/></div><Select label="Slot vəziyyəti" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Hamısı</option><option value="available">Boş</option><option value="occupied">Dolu</option><option value="reserved">Rezerv</option></Select></div>
  <div className="slot-management-grid">{visible.map(s=><article className={`slot-management-item slot-management-item--${s.state}`} key={s.number}><span className="slot-management-item__number">{String(s.number).padStart(2,'0')}</span><div><strong>{s.state==='occupied'?snapshot.teams.find(t=>t.id===s.teamId)?.name??'Komanda':s.state==='reserved'?'Rezerv slot':'Boş'}</strong><small>{s.state==='occupied'?'Təsdiqlənmiş qeydiyyat':s.state==='reserved'?'Rezerv':'Boş slot'}</small></div><StatusBadge status={s.state==='occupied'?(checked(s.teamId!)?'checked-in':'warning'):s.state==='reserved'?'locked':'approved'}>{s.state==='occupied'?(checked(s.teamId!)?'Check-in tamamdır':'Check-in gözlənilir'):s.state==='reserved'?'Rezerv':'Boş'}</StatusBadge><Button disabled={assignmentClosed} variant="ghost" aria-label={`Slot ${s.number} əməliyyatları`} onClick={()=>open('slot',s.number,s.teamId??'')}><MoreHorizontal size={17}/></Button></article>)}</div>
  {!visible.length&&<EmptyState title="Uyğun slot yoxdur" body="Axtarışı və vəziyyət filtrini dəyişin."/>}
  </div>
  {view==='registrations'&&<TournamentOperations key={revision} tournamentId={tournament.id} section="registrations"/>}
  {view==='rooms'&&<><AdminPanel title="Otaqların hazırlığı" description="Yalnız qurulma vəziyyəti göstərilir. Otaq ID-si və şifrə bu siyahıya daxil deyil.">{roomQuery.loading?<p className="admin-inline-empty" role="status">Otaq vəziyyəti yüklənir…</p>:roomQuery.error?<p className="admin-inline-empty" role="alert">Otaq vəziyyəti yüklənmədi. <Button variant="ghost" onClick={roomQuery.refetch}>Yenidən yoxla</Button></p>:<ol className="admin-schedule-list">{rounds.map(m=><li key={m.id}><span>{String(m.round).padStart(2,'0')}</span><div><strong>{m.map}</strong><small>{formatEventDate(m.startsAt,{withTime:true})} AZT</small></div><StatusBadge status={roomQuery.data?.find(r=>r.id===m.id)?.ready?'approved':'warning'}>{roomQuery.data?.find(r=>r.id===m.id)?.ready?'Otaq hazırdır':'Qurulmayıb'}</StatusBadge></li>)}</ol>}</AdminPanel><TournamentOperations tournamentId={tournament.id} section="rooms"/></>}

  <div hidden={view!=='settings'}><TournamentEditForm tournamentId={tournament.id}/><AdminPanel title="Turnirin həyat dövrü" description="Ləğv və arxivləşdirmə ayrıca təsdiq tələb edir."><div className="admin-queue-links"><Link className="button button--secondary" to={`/admin/tournaments/${tournament.id}/lifecycle`}>Həyat dövrü əməliyyatları <ArrowRight size={15}/></Link></div></AdminPanel></div>
  <Modal open={!!action} title={action==='slot'?'Komandaya slot təyin et':'Check-in düzəlişi'} onClose={()=>{if(!busy)setAction(undefined);}}><form className="operation-form" onSubmit={save}><Select label="Komanda" value={teamId} required onChange={e=>setTeamId(e.target.value)}><option value="">Komanda seçin</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</Select>{action==='slot'?<><Input label="Slot nömrəsi" type="number" min={1} max={tournament.maxSlots} required value={slot} onChange={e=>setSlot(Number(e.target.value))}/><p>Komanda turnirdə təsdiqlənir. Mövcud iştirakın heyəti qorunur; dolu slota başqa komanda təyin edilmir.</p></>:<Select key={teamId} label="Check-in vəziyyəti" name="checkedIn" defaultValue={checked(teamId)?'true':'false'}><option value="true">Check-in tamamdır</option><option value="false">Check-in yoxdur</option></Select>}<Textarea label="Düzəliş səbəbi" name="reason" minLength={10} maxLength={2000} required/>{error&&<p role="alert">{error}</p>}<Button type="submit" loading={busy} disabled={!teamId}>Dəyişikliyi saxla</Button></form></Modal>
  </>;
}
