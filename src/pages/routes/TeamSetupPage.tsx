import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CheckCheck, ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { BrandMark } from '../../components/brand/BrandMark';
import { Button, Input, Checkbox } from '../../components/common/primitives';
import { FileUpload } from '../../components/common/FileUpload';
import { ImageEditor } from '../../components/common/ImageEditor';
import { ProtectedRoute } from '../../layouts/ProtectedRoute';
import { ApiError } from '../../services/apiError';
import { services } from '../../services';
import { usePublicSession } from '../../services/PublicSessionContext';
import { usePlatformQuery } from '../../services/queryCache';
import type { AccountOnboarding, TeamRegistrationDraft } from '../../types/domain';
import '../../app/workspaceStyles';
import '../../styles/team-workspace.css';
import '../../styles/onboarding.css';

type Draft=Omit<TeamRegistrationDraft,'email'>;
const blankPlayers:Draft['players']=Array.from({length:5},(_,i)=>({ign:'',uid:'',role:i===0?'captain':i===4?'substitute':'starter'}));
export function TeamSetupPage(){return <ProtectedRoute area="account"><SetupEntry/></ProtectedRoute>;}
function SetupEntry(){
 const {session}=usePublicSession();
 const query=usePlatformQuery({key:`account:onboarding:${session?.user.id}`,scope:'private',query:()=>services.account.onboarding(),staleTime:0});
 return <div className="team-setup-shell product-shell--team"><header className="team-setup-shell__header"><BrandMark/><Link to="/account">Hesabım</Link></header><main className="team-setup" id="main-content"><header className="team-setup__heading"><small>KOMANDA PANELİ · İLK ADDIM</small><h1>Komandanın əsası burada qoyulur</h1><p>Komanda kimliyini, kapitanı və əsas heyəti tamamla. Turnirə iştirak üçün daha sonra ayrıca qoşulacaqsan.</p></header>{query.loading?<p role="status">Quruluş yüklənir…</p>:query.error?<div role="alert"><p>Qaralama yüklənmədi.</p><Button onClick={query.refetch}>Yenidən yoxla</Button></div>:query.data&&<SetupForm initial={query.data}/>}</main></div>;
}
function SetupForm({initial}:{initial:AccountOnboarding}){
 const {session,refresh}=usePublicSession();
 const [state,setState]=useState(initial),[draft,setDraft]=useState<Draft>(()=>({teamName:'',tag:'',phone:session?.user.phone??'',firstName:session?.user.firstName??'',lastName:session?.user.lastName??'',players:blankPlayers.map(p=>({...p})),...initial.draft}));
 const [step,setStep]=useState(()=>initial.draft.teamName&&initial.draft.teamName.length>=2?initial.draft.phone&&initial.draft.players?.slice(0,4).every(p=>p.ign.length>=2&&p.uid.length>=5)?2:1:0),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState(''),[accepted,setAccepted]=useState(false),[teamId,setTeamId]=useState(initial.teamId),[editing,setEditing]=useState<{file:File;kind:'logo'|'banner'}>(),[files,setFiles]=useState<Partial<Record<'logo'|'banner',File>>>({});
 const pending=useRef(false),[key]=useState(()=>crypto.randomUUID());
 const set=(field:keyof Draft,value:string)=>setDraft(d=>({...d,[field]:value}));
 const save=async()=>{if(pending.current)return;pending.current=true;setBusy(true);setNotice('');setError('');try{const next=await services.account.saveOnboarding({purpose:'team',revision:state.revision,draft});setState(next);setNotice('Qaralama hesabınızda saxlanıldı.');refresh();}catch(e){setError(e instanceof Error?e.message:'Qaralama saxlanılmadı.');}finally{pending.current=false;setBusy(false);}};
 const uploadMedia=async(id:string)=>{
  for(const kind of ['logo','banner'] as const){const file=files[kind];if(!file)continue;let bitmap:ImageBitmap|undefined;try{bitmap=await createImageBitmap(file);await services.media.uploadBrandAsset({ownerType:'team',ownerId:id,assetType:kind,fileName:file.name,mimeType:file.type,sizeBytes:file.size,width:bitmap.width,height:bitmap.height},file);setFiles(f=>({...f,[kind]:undefined}));}finally{bitmap?.close();}}
 };
 const submit=async(e:FormEvent)=>{
  e.preventDefault();if(pending.current)return;setError('');setNotice('');
  if(step<2){
   if(step===1){const used=draft.players.filter(p=>p.ign||p.uid);if(new Set(used.map(p=>p.uid)).size!==used.length){setError('Hər oyunçu üçün fərqli PUBG ID daxil edin.');return;}}
   pending.current=true;setBusy(true);
   try{const next=await services.account.saveOnboarding({purpose:'team',revision:state.revision,draft});setState(next);setStep(step+1);refresh();}
   catch(e){setError(e instanceof Error?e.message:'Qaralama saxlanılmadı.');}finally{pending.current=false;setBusy(false);}return;
  }
  if(!accepted){setError('Komanda məlumatlarını və qaydaları təsdiqləyin.');return;}
  pending.current=true;setBusy(true);
  try{
   const next=await services.account.saveOnboarding({purpose:'team',revision:state.revision,draft});setState(next);
   const result=await services.account.completeTeamSetup(draft,key);setTeamId(result.teamId);
   window.dispatchEvent(new Event('aevic:onboarding-complete'));
   try{await uploadMedia(result.teamId);}catch{setError('Komanda yaradıldı. Seçilmiş şəkil yüklənmədi; yenidən cəhd edə və ya paneldən əlavə edə bilərsiniz.');}
   refresh();
  }catch(e){if(e instanceof ApiError&&['ONBOARDING_NOT_PENDING','ALREADY_MEMBER'].includes(e.code)){const latest=await services.account.onboarding();if(latest.teamId){setTeamId(latest.teamId);refresh();}}setError(e instanceof Error?e.message:'Komanda yaradılmadı.');}finally{pending.current=false;setBusy(false);}
 };
 const readyTeam=teamId??session?.user.teamId;
 if(readyTeam)return <section className="team-setup__surface"><CheckCheck size={32}/><h2>Komandanın quruluşu tamamlandı</h2><p>Komanda yoxlama üçün göndərildi. Bu, turnir qeydiyyatı deyil.</p>{error&&<p role="alert">{error}</p>}{busy&&<p role="status">Şəkillər yüklənir…</p>}<div className="team-setup__actions">{Object.values(files).some(Boolean)&&<Button variant="secondary" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await uploadMedia(readyTeam);}catch{setError('Şəkil yüklənmədi. Paneldən yenidən cəhd edin.');}finally{setBusy(false);}}}>Şəkilləri yenidən yüklə</Button>}<Link className="button button--primary" to="/team">Komanda panelini aç</Link></div></section>;
 return <><ol className="team-setup__steps" aria-label="Komanda quruluşu">{['Kimlik','Kapitan və heyət','Yoxla və tamamla'].map((label,i)=><li key={label} aria-current={step===i?'step':undefined}>{i+1}. {label}</li>)}</ol><form className="team-setup__surface" onSubmit={submit}><fieldset className="onboarding-fields" disabled={busy}>
 {step===0&&<section><h2>Komanda kimliyi</h2><p className="admin-field-hint">Komandaya dəvət almısınız? <Link to="/account/invitations">Dəvətlərə baxın</Link></p><div className="form-grid"><Input label="Komanda adı" value={draft.teamName} onChange={e=>set('teamName',e.target.value)} required minLength={2} maxLength={60} placeholder="Komandanızın adı"/><Input label="Qısa tag" value={draft.tag} onChange={e=>set('tag',e.target.value.toUpperCase())} maxLength={12} optional/></div><p className="admin-field-hint">Şəkillər komanda yaradılarkən yüklənir. Qaralamada yalnız mətn məlumatları saxlanılır.</p><div className="team-setup__media">{(['logo','banner'] as const).map(kind=><div key={kind}><FileUpload label={kind==='logo'?'Loqo əlavə et (istəyə bağlı)':'Banner əlavə et (istəyə bağlı)'} accept={['image/png','image/jpeg','image/webp']} maxBytes={4_000_000} preview="none" onFile={file=>setEditing({file,kind})}/>{files[kind]&&<><MediaPreview file={files[kind]!}/><Button variant="ghost" onClick={()=>setFiles(f=>({...f,[kind]:undefined}))}>Şəkli sil</Button></>}</div>)}</div></section>}
 {step===1&&<><section><h2>Kapitan</h2><div className="form-grid"><Input label="Ad" value={draft.firstName} autoComplete="given-name" required maxLength={80} onChange={e=>set('firstName',e.target.value)}/><Input label="Soyad" value={draft.lastName} autoComplete="family-name" required maxLength={80} onChange={e=>set('lastName',e.target.value)}/></div><Input label="Əlaqə telefonu" type="tel" value={draft.phone} autoComplete="tel" minLength={6} maxLength={30} required onChange={e=>set('phone',e.target.value)}/><p className="admin-field-hint">E-poçt: {session?.user.email}. Komanda yaratmaq üçün ünvan təsdiqlənməlidir. <Link to="/verify-email">Təsdiqi yoxla</Link></p></section><section><h2>Əsas heyət</h2><p>Kapitan + 3 əsas oyunçu. Beşinci oyunçu istəyə bağlıdır.</p><div className="team-setup__roster">{draft.players.map((p,i)=><div key={i}><b>{String(i+1).padStart(2,'0')}</b><Input label={i===0?'Kapitan IGN':`${i+1}. oyunçu IGN`} value={p.ign} required={i<4||Boolean(p.uid)} minLength={2} maxLength={40} onChange={e=>setDraft(d=>({...d,players:d.players.map((p,n)=>n===i?{...p,ign:e.target.value}:p)}))}/><Input label={`${i+1}. oyunçu PUBG ID`} value={p.uid} inputMode="numeric" pattern="[0-9]{5,20}" required={i<4||Boolean(p.ign)} maxLength={20} onChange={e=>setDraft(d=>({...d,players:d.players.map((p,n)=>n===i?{...p,uid:e.target.value}:p)}))}/></div>)}</div></section></>}
 {step===2&&<section><h2>{draft.teamName}</h2><p>{draft.firstName} {draft.lastName} · {draft.players.filter(p=>p.ign).length} oyunçu</p><p>Komanda yoxlamaya göndəriləcək. Loqo və banner yaradılma zamanı yüklənir; sonradan da dəyişdirilə bilər.</p><Checkbox label="Məlumatların düzgünlüyünü və yarış qaydalarını təsdiqləyirəm" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/><Link to="/regulations">Yarış qaydaları</Link></section>}
 {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}<div className="team-setup__actions">{step>0?<Button variant="ghost" icon={<ArrowLeft size={17}/>} onClick={()=>setStep(step-1)}>Geri</Button>:<Link to="/account/onboarding">Hesab məqsədini dəyiş</Link>}<Button variant="secondary" icon={<Save size={17}/>} onClick={()=>void save()}>Qaralamanı saxla</Button><Button type="submit" loading={busy} icon={<ArrowRight size={17}/>}>{step===2?'Komandanı yarat':'Davam et'}</Button></div>
 </fieldset></form>{editing&&<ImageEditor file={editing.file} title={editing.kind==='logo'?'Loqonu düzəlt':'Banneri düzəlt'} width={editing.kind==='logo'?1024:1600} height={editing.kind==='logo'?1024:500} fit="cover" onCancel={()=>setEditing(undefined)} onApply={file=>{setFiles(f=>({...f,[editing.kind]:file}));setEditing(undefined);}}/>}</>;
}
function MediaPreview({file}:{file:File}){const [url,setUrl]=useState('');useEffect(()=>{const next=URL.createObjectURL(file);setUrl(next);return()=>URL.revokeObjectURL(next);},[file]);return url?<img src={url} alt="Seçilmiş komanda şəklinin önbaxışı"/>:null;}
