import { useFullBleedRail } from '../../components/common/useFullBleedRail';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, CheckCheck, ClipboardCheck, FileImage, History, Pencil, RefreshCw, Save, ShieldCheck, Trophy } from 'lucide-react';
import { RoundScreenshotDraft } from '../../components/admin/RoundScreenshotDraft';
import { ScreenshotResultDraft } from '../../components/admin/ScreenshotResultDraft';
import { AdminTournamentSelect } from '../../components/admin/AdminTournamentSelect';
import { adminTournamentStatuses, tournamentStatusTone } from '../../utils/adminTournamentStatus';
import { Button, ConfirmDialog, EmptyState, Input, LoadingSkeleton, PageHeader, Select, StatusBadge } from '../../components/common/primitives';
import { scoreMatch } from '../../utils/scoring';
import { ApiError } from '../../services/apiError';
import { serviceCapabilities, services } from '../../services';
import { useAdminPlatformData } from '../../services/PlatformDataContext';
import { invalidateQuery } from '../../services/queryCache';
import { formatEventDate } from '../../utils/calendar';
import type { AdminPlatformSnapshot, MatchScheduleItem, RoundResult, Tournament } from '../../types/domain';
import '../../styles/admin-results.css';

type RoundState={count:number;published:boolean;corrected:boolean};

export function ResultEntryForm() {
  const railRef = useFullBleedRail<HTMLElement>();
  const snapshot=useAdminPlatformData();
  const [params,setParams]=useSearchParams();
  const tour=params.get('tournament')??'',round=params.get('round')??'';
  const [locked,setLocked]=useState(false);
  const [roundStates,setRoundStates]=useState<Record<string,RoundState>>({});
  const updateRoundState=useCallback((id:string,state:RoundState)=>setRoundStates(previous=>JSON.stringify(previous[id])===JSON.stringify(state)?previous:{...previous,[id]:state}),[]);
  const tournament=snapshot.tournaments.find(t=>t.id===tour);
  const rounds=(snapshot.matchSchedule??[]).filter(m=>m.tournamentId===tour).sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt));
  const selected=rounds.find(m=>m.id===round);
  const choose=(tournamentId:string,roundId='')=>{if(locked)return;setParams({tournament:tournamentId,...(roundId?{round:roundId}:{})},{replace:true});};
  return <div className="results-workspace"><PageHeader eyebrow="Yarış əməliyyatları" title="Nəticələr" description="Raundu seçin, nəticələri yoxlayın və rəsmi dərcə hazırlayın." actions={<Link className="button button--ghost" to="/admin/tournaments?view=calendar">Təqvim <ArrowUpRight size={16}/></Link>}/>
    <section className="results-context" aria-label="Turnir və raund seçimi"><AdminTournamentSelect tournaments={snapshot.tournaments} value={tour} disabled={locked} onChange={id=>choose(id)}/>{tournament&&<div className="results-context-meta"><StatusBadge status={tournamentStatusTone(tournament.status)}>{adminTournamentStatuses[tournament.status]??tournament.status}</StatusBadge><Link to={`/admin/tournaments/${tour}`}>Turniri idarə et <ArrowUpRight size={15}/></Link></div>}</section>
    {tournament&&<><nav ref={railRef} className="results-rounds" aria-label="Raundlar">{rounds.map(m=>{const state=roundStates[m.id];const published=state?.published||snapshot.publishedRoundIds?.[tour]?.includes(m.id)||!!m.publishedAt;return <button key={m.id} aria-pressed={m.id===round} disabled={locked} onClick={()=>choose(tour,m.id)}><span><b>{String(m.round).padStart(2,'0')}</b><strong>{m.map}</strong></span><time dateTime={m.startsAt}>{formatEventDate(m.startsAt,{withTime:true,includeYear:false})}</time><small data-published={published}>{published?<><CheckCheck size={13}/>{state?.corrected?'Düzəliş edilib':'Dərc edilib'}</>:state?.count?<>Qaralama · {state.count} komanda</>:<> {m.status==='live'?'Canlı · nəticə gözlənilir':'Dərc edilməyib'}</>}</small></button>;})}</nav>{!rounds.length&&<EmptyState title="Raund yoxdur" body="Turnirin cədvəlini idarəetmə səhifəsində tamamlayın."/>}</>}
    {tournament&&selected?<ResultRoundWorkspace key={`${tour}:${round}`} tournament={tournament} match={selected} snapshot={snapshot} onLockChange={setLocked} onStateChange={updateRoundState}/>:<EmptyState icon={<Trophy size={28}/>} title={tournament?'Raund seçin':'Turnir seçin'} body={tournament?'Nəticə əməliyyatlarına başlamaq üçün yuxarıdakı raundlardan birini seçin.':'Axtarışdan turniri tapın və nəticə iş sahəsini açın.'}/>}
  </div>;
}

function ResultRoundWorkspace({tournament,match,snapshot,onLockChange,onStateChange}:{tournament:Tournament;match:MatchScheduleItem;snapshot:AdminPlatformSnapshot;onLockChange:(locked:boolean)=>void;onStateChange:(id:string,state:RoundState)=>void}) {
  const tour=tournament.id,round=match.id;
  const [saved,setSaved]=useState<RoundResult[]>([]),[loaded,setLoaded]=useState(false),[loadError,setLoadError]=useState(''),[revision,setRevision]=useState(0);
  const [entries,setEntries]=useState<Array<{teamId:string;status:string}>>([]),[entriesLoaded,setEntriesLoaded]=useState(false);
  const [busy,setBusy]=useState(false),[review,setReview]=useState(false),[editing,setEditing]=useState<string|null>(null),[confirmPublish,setConfirmPublish]=useState(false);
  const [publishedHere,setPublishedHere]=useState(false),[notice,setNotice]=useState(''),[publishError,setPublishError]=useState('');
  const [score,setScore]=useState({placement:1,kills:0,penalties:0});
  const submitting=useRef(false),alive=useRef(true);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  useEffect(()=>{onLockChange(busy||review||editing!==null);return()=>onLockChange(false);},[busy,review,editing,onLockChange]);
  useEffect(()=>{
    let active=true;setLoaded(false);setEntriesLoaded(false);setLoadError('');
    void Promise.all([services.results.roundEntries(round),services.tournaments.entries(tour)]).then(([rows,participants])=>{if(active){setSaved(rows);setEntries(participants);setLoaded(true);setEntriesLoaded(true);}}).catch(()=>{if(active)setLoadError('Nəticələr və ya qeydiyyatlar yüklənmədi. Yenidən cəhd edin.');});
    return()=>{active=false;};
  },[round,tour,revision]);
  const published=publishedHere||saved.some(r=>r.published)||!!snapshot.publishedRoundIds?.[tour]?.includes(round)||!!match.publishedAt;
  useEffect(()=>{if(loaded)onStateChange(round,{count:saved.length,published,corrected:saved.some(r=>(r.version??1)>1)});},[loaded,round,saved,published,onStateChange]);
  const participants=entries.filter(e=>e.status==='confirmed').map(e=>{const team=snapshot.teams.find(t=>t.id===e.teamId);return {id:e.teamId,name:team?.name??e.teamId,tag:team?.tag};});
  const teamName=(id:string)=>snapshot.teams.find(t=>t.id===id)?.name??id;
  const complete=participants.length>0&&participants.every(t=>saved.some(r=>r.teamId===t.id));
  const duplicate=saved.some(r=>r.teamId!==editing&&r.placement===score.placement);
  const preview=scoreMatch(tournament.pointFormula,score.placement,score.kills,score.penalties);
  const canWrite=serviceCapabilities.resultPublishing&&loaded&&entriesLoaded&&!published&&!busy;
  const edit=(id:string)=>{const row=saved.find(r=>r.teamId===id);setScore({placement:row?.placement??1,kills:row?.finishes??0,penalties:row?.penalties??0});setEditing(id);setNotice('');};
  const reload=async()=>{try{const rows=await services.results.roundEntries(round);if(alive.current){setSaved(rows);setLoaded(true);}}catch(error){if(alive.current)setLoadError('Əməliyyatdan sonrakı vəziyyət yüklənmədi. Yenidən cəhd edin.');throw error;}};
  const fail=(error:unknown,fallback:string)=>setNotice(error instanceof ApiError?error.message:fallback);
  const save=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();if(submitting.current||!canWrite||!editing||duplicate)return;submitting.current=true;setBusy(true);setNotice('');
    try {const existing=saved.find(r=>r.teamId===editing);await services.results.saveRound({id:existing?.id??crypto.randomUUID(),tournamentId:tour,roundId:round,teamId:editing,placement:score.placement,finishes:score.kills,penalties:score.penalties,placementPoints:0,finishPoints:0,totalPoints:0,published:false});setEditing(null);setLoaded(false);await reload();setNotice('Qaralama saxlanıldı. Nəticələr hələ dərc edilməyib.');}
    catch(error){fail(error,'Saxlama və ya son nəticələrin yüklənməsi tamamlanmadı. Yeniləyib yoxlayın.');}finally{submitting.current=false;setBusy(false);}
  };
  const publish=async()=>{
    if(submitting.current||!canWrite||!complete||review||editing!==null)return;submitting.current=true;setBusy(true);setNotice('');
    try{await services.tournaments.publishMatch(round);setPublishedHere(true);setConfirmPublish(false);invalidateQuery('snapshot:admin');invalidateQuery('snapshot:public');setLoaded(false);await reload();setNotice('Raundun rəsmi nəticələri dərc edildi.');}
    catch(error){const message=error instanceof ApiError?error.message:'Dərc və ya son nəticələrin yüklənməsi tamamlanmadı. Yeniləyib vəziyyəti yoxlayın.';setNotice(message);setPublishError(message);}finally{submitting.current=false;setBusy(false);}
  };
  return <section aria-label="Raund nəticələri" className="results-round-workspace" aria-busy={busy}>
    <header className="results-round-heading"><div><span className="results-eyebrow">RAUND {String(match.round).padStart(2,'0')}</span><h2>{match.map} <StatusBadge status={published?'completed':'draft'}>{!loaded?'Yüklənir…':published?'Dərc edilib':'Qaralama'}</StatusBadge></h2><p>{formatEventDate(match.startsAt,{withTime:true})} · Bakı vaxtı</p></div><Button variant="ghost" aria-label="Nəticələri yenilə" icon={<RefreshCw size={16}/>} disabled={busy||review||editing!==null} onClick={()=>setRevision(v=>v+1)}>Yenilə</Button></header>
    {notice&&<p className="results-notice" role="status">{notice}</p>}
    {loadError?<div className="results-notice" role="alert">{loadError}<Button variant="ghost" onClick={()=>setRevision(v=>v+1)}>Yenidən cəhd et</Button></div>:!loaded?<LoadingSkeleton rows={4}/>:<div className="results-main-grid"><div className="results-main">
      {review?<RoundScreenshotDraft key={round} participants={participants} saved={saved} busy={busy} onCancel={()=>setReview(false)} onSave={async(rows,expected)=>{
        if(submitting.current||!canWrite)return;submitting.current=true;setBusy(true);setNotice('');
        try{await services.results.saveRoundDraft(round,tour,rows,expected);setReview(false);setEditing(null);setLoaded(false);await reload();setNotice('Yoxlanmış raund qaralaması saxlanıldı. Rəsmi dərc ayrıca təsdiq tələb edir.');}
        catch(error){if(error instanceof ApiError&&error.code==='STALE_VERSION'){setNotice('Nəticələr dəyişib. Qaralamanı bağlayın və son dəyərləri yeniləyin.');}else fail(error,'Qaralamanın saxlanması və ya yenilənməsi tamamlanmadı.');}finally{submitting.current=false;setBusy(false);}
      }}/>:<>
        {!published&&editing===null&&<section className="results-import"><span><FileImage size={24}/></span><div><h3>Şəkillərdən nəticə hazırla</h3><p>Bir və ya bir neçə PUBG Mobile şəkli · OCR və komanda uyğunlaşdırması</p></div><Button variant="secondary" disabled={!canWrite||!participants.length} onClick={()=>{setReview(true);setNotice('');}}>Şəkilləri əlavə et</Button></section>}
        {editing!==null?<form id="result-entry" className="results-editor" onSubmit={save}><header><div><span className="results-eyebrow">QARALAMA REDAKTƏSİ</span><h3>{editing?teamName(editing):'Komanda seçin'}</h3></div><Button variant="ghost" disabled={busy} onClick={()=>setEditing(null)}>Bağla</Button></header>
          <Select label="Komanda" value={editing} disabled={busy} onChange={e=>edit(e.target.value)} required><option value="">Komanda seçin</option>{participants.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</Select>
          <div className="results-edit-fields"><Input label="Yerləşmə" name="placement" type="number" min={1} max={100} required value={score.placement} onChange={e=>setScore(s=>({...s,placement:Number(e.target.value)}))}/><Input label="Kill sayı" name="kills" type="number" min={0} max={400} required value={score.kills} onChange={e=>setScore(s=>({...s,kills:Number(e.target.value)}))}/><Input label="Cərimə xalı" name="penalties" type="number" min={0} max={1000} required value={score.penalties} onChange={e=>setScore(s=>({...s,penalties:Number(e.target.value)}))}/></div>
          {duplicate&&<p role="alert" className="field__error">Bu yerləşmə başqa komandaya verilib.</p>}<div className="results-score-breakdown"><span>Yerləşmə <b>{preview.placementPoints}</b></span><span>Eliminasiya <b>{preview.finishPoints}</b></span><span>Cərimə <b>−{score.penalties}</b></span><strong>{preview.totalPoints} xal</strong></div>
          {editing&&<ScreenshotResultDraft key={editing} teamName={teamName(editing)} disabled={busy} onVerify={fields=>setScore(s=>({...s,...fields}))}/>}
          <Button type="submit" icon={<Save size={16}/>} loading={busy} disabled={!canWrite||!editing||duplicate}>Komanda nəticəsini saxla</Button>
        </form>:<section className="results-table-panel"><header><h3>Komanda nəticələri <span>{saved.length}/{participants.length}</span></h3>{!published&&<Button variant="ghost" disabled={!canWrite||!participants.length} icon={<Pencil size={15}/>} onClick={()=>edit('')}>Əllə daxil et</Button>}</header>
          {saved.length?<div className="results-table-scroll" tabIndex={0} role="region" aria-label="Saxlanmış nəticələr"><table><caption className="sr-only">Saxlanmış nəticələr · server tərəfindən hesablanan xallar</caption><thead><tr><th>Yer</th><th>Komanda</th><th>Kill</th><th>Yer xalı</th><th>Cərimə</th><th>Cəmi</th><th>Vəziyyət</th><th><span className="sr-only">Əməliyyat</span></th></tr></thead><tbody>{[...saved].sort((a,b)=>a.placement-b.placement).map(r=><tr key={r.id}><td><span className="results-placement" data-winner={r.placement===1}>#{r.placement}</span></td><th scope="row">{teamName(r.teamId)}</th><td>{r.finishes}</td><td>{r.placementPoints}</td><td>{r.penalties?`−${r.penalties}`:'—'}</td><td><strong>{r.totalPoints}</strong></td><td><StatusBadge status={r.published?'completed':'draft'}>{r.published?(r.version??1)>1?'Düzəliş edilib':'Dərc edilib':'Qaralama'}</StatusBadge></td><td>{r.published?<Link className="results-row-action" to={`/admin/results/${r.id}/correct`}><History size={14}/>Düzəliş et</Link>:<button className="results-row-action" disabled={!canWrite} onClick={()=>edit(r.teamId)}><Pencil size={14}/>Redaktə et</button>}</td></tr>)}</tbody></table></div>:<div className="results-table-empty"><ClipboardCheck size={28}/><strong>Nəticə daxil edilməyib</strong><p>Şəkillərdən başlayın və ya komanda nəticəsini əllə daxil edin.</p></div>}
          {!published&&participants.some(t=>!saved.some(r=>r.teamId===t.id))&&<div className="results-missing"><small>NƏTİCƏ GÖZLƏNİLİR</small><div>{participants.filter(t=>!saved.some(r=>r.teamId===t.id)).map(t=><button key={t.id} disabled={!canWrite} onClick={()=>edit(t.id)}>{t.name}<Pencil size={12}/></button>)}</div></div>}
        </section>}
      </>}
    </div><aside className="results-summary"><header><ShieldCheck size={18}/><h3>Dərc yoxlaması</h3></header><dl><div><dt>Saxlanmış komanda</dt><dd>{saved.length} / {participants.length}</dd></div><div><dt>Ümumi eliminasiya</dt><dd>{saved.reduce((n,r)=>n+r.finishes,0)}</dd></div><div><dt>Cərimə xalları</dt><dd>{saved.reduce((n,r)=>n+r.penalties,0)}</dd></div></dl><div className="results-validation"><CheckCheck size={17}/><span>{published?'Rəsmi nəticələr dərc edilib.':complete?'Bütün komandaların nəticələri saxlanılıb.':`${Math.max(0,participants.length-saved.length)} komandanın nəticəsi gözlənilir.`}</span></div><p>Xallar serverdə hesablanır. Şəkillərin oxunması və qaralama saxlanması nəticələri dərc etmir.</p>{published&&<Link to={`/tournaments/${tour}?match=${round}#results`}>Rəsmi nəticələrə bax <ArrowUpRight size={15}/></Link>}</aside></div>}
    {loaded&&!loadError&&<footer className="results-actionbar"><div><StatusBadge status={published?'completed':'draft'}>{published?'Dərc edilib':'Qaralama'}</StatusBadge><span>{published?'Dəyişikliklər versiyalı düzəlişlə saxlanılır.':review?'Şəkilləri yoxlayın və qaralamanı saxlayın.':'Qaralama ictimai nəticələri dəyişmir.'}</span></div><Button icon={<CheckCheck size={17}/>} disabled={!canWrite||!complete||review||editing!==null} loading={busy&&confirmPublish} onClick={()=>{setPublishError('');setConfirmPublish(true);}}>Raundu dərc et</Button></footer>}
    <ConfirmDialog errorMessage={publishError} open={confirmPublish} title="Raund nəticələrini dərc et?" body={`${saved.length} komandanın saxlanmış nəticəsi ictimai olacaq. Dərcdən sonrakı dəyişikliklər əsaslandırılmış və versiyalı düzəliş tələb edir.`} confirmLabel="Nəticələri dərc et" onClose={()=>{if(!busy)setConfirmPublish(false);}} onConfirm={publish}/>
  </section>;
}
