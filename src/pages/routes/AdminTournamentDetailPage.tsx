import { ClipboardCheck, MoreHorizontal, Plus, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link,useParams } from 'react-router-dom';
import { Button,EmptyState,Input,Modal,PageHeader,ProgressBar,Select,StatusBadge,Textarea } from '../../components/common/primitives';
import { useAdminPlatformData } from '../../services/PlatformDataContext';
import { services } from '../../services';
import { invalidateQuery } from '../../services/queryCache';
import { selectAdminOperations } from '../../utils/adminOperations';
import { formatEventDate } from '../../utils/calendar';
import { tournamentById } from '../../utils/routes';
import { TournamentEditForm,TournamentOperations } from '../AdminCompetitionForms';

export function AdminTournamentDetailPage() {
  const snapshot=useAdminPlatformData(),{tournamentId}=useParams();
  const tournament=tournamentById(snapshot.tournaments,tournamentId);
  const [query,setQuery]=useState(''),[filter,setFilter]=useState('all');
  const [action,setAction]=useState<'slot'|'check'>(),[teamId,setTeamId]=useState(''),[slot,setSlot]=useState(1);
  const [revision,setRevision]=useState(0);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
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
  return <><PageHeader eyebrow="Slot və check-in əməliyyatları" title={tournament.name} description={`${capacity.occupied}/${capacity.total} doludur · check-in ${formatEventDate(tournament.checkInOpensAt,{withTime:true})} AZT`} actions={<><Link className="button button--secondary" to={`/admin/tournaments/${tournament.id}/lifecycle`}>Həyat dövrü</Link><Button disabled={terminal||!confirmed.length} variant="secondary" icon={<ClipboardCheck size={17}/>} onClick={()=>open('check')}>Check-in düzəlişi</Button><Button disabled={assignmentClosed} icon={<Plus size={17}/>} onClick={()=>open('slot')}>Komanda təyin et</Button></>}/>
  {notice&&<p role="status">{notice}</p>}
  <section className="slot-admin-summary"><div><span>Dolu</span><strong>{capacity.occupied}</strong></div><div><span>Boş</span><strong>{capacity.available}</strong></div><div><span>Rezerv</span><strong>{capacity.reserved}</strong></div><div><span>Cəmi</span><strong>{capacity.total}</strong></div><ProgressBar value={capacity.occupied+capacity.reserved} max={capacity.total}/></section>
  <div className="admin-toolbar"><div className="search-field"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} aria-label="Komanda və slot axtar" placeholder="Komanda və ya slot axtar"/></div><Select label="Slot vəziyyəti" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Hamısı</option><option value="available">Boş</option><option value="occupied">Dolu</option><option value="reserved">Rezerv</option></Select></div>
  <div className="slot-management-grid">{visible.map(s=><article className={`slot-management-item slot-management-item--${s.state}`} key={s.number}><span className="slot-management-item__number">{String(s.number).padStart(2,'0')}</span><div><strong>{s.state==='occupied'?snapshot.teams.find(t=>t.id===s.teamId)?.name??'Komanda':s.state==='reserved'?'Rezerv slot':'Boş'}</strong><small>{s.state==='occupied'?'Təsdiqlənmiş qeydiyyat':s.state==='reserved'?'Rezerv':'Boş slot'}</small></div><StatusBadge status={s.state==='occupied'?(checked(s.teamId!)?'checked-in':'warning'):s.state==='reserved'?'locked':'approved'}>{s.state==='occupied'?(checked(s.teamId!)?'Check-in tamamdır':'Check-in gözlənilir'):s.state==='reserved'?'Rezerv':'Boş'}</StatusBadge><Button disabled={assignmentClosed} variant="ghost" aria-label={`Slot ${s.number} əməliyyatları`} onClick={()=>open('slot',s.number,s.teamId??'')}><MoreHorizontal size={17}/></Button></article>)}</div>
  {!visible.length&&<EmptyState title="Uyğun slot yoxdur" body="Axtarışı və vəziyyət filtrini dəyişin."/>}
  <TournamentEditForm tournamentId={tournament.id}/><TournamentOperations key={revision} tournamentId={tournament.id}/>
  <Modal open={!!action} title={action==='slot'?'Komandaya slot təyin et':'Check-in düzəlişi'} onClose={()=>{if(!busy)setAction(undefined);}}><form className="operation-form" onSubmit={save}><Select label="Komanda" value={teamId} required onChange={e=>setTeamId(e.target.value)}><option value="">Komanda seçin</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</Select>{action==='slot'?<><Input label="Slot nömrəsi" type="number" min={1} max={tournament.maxSlots} required value={slot} onChange={e=>setSlot(Number(e.target.value))}/><p>Komanda turnirdə təsdiqlənir. Mövcud iştirakın heyəti qorunur; dolu slota başqa komanda təyin edilmir.</p></>:<Select key={teamId} label="Check-in vəziyyəti" name="checkedIn" defaultValue={checked(teamId)?'true':'false'}><option value="true">Check-in tamamdır</option><option value="false">Check-in yoxdur</option></Select>}<Textarea label="Düzəliş səbəbi" name="reason" minLength={10} maxLength={2000} required/>{error&&<p role="alert">{error}</p>}<Button type="submit" loading={busy} disabled={!teamId}>Dəyişikliyi saxla</Button></form></Modal>
  </>;
}
