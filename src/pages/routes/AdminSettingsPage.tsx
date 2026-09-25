import {useEffect,useState,type FormEvent} from 'react';
import {Button,Input,Textarea,Switch,PageHeader,LoadingSkeleton,Toast} from '../../components/common/primitives';
import {services} from '../../services';
import {usePlatformQuery} from '../../services/queryCache';
type Settings=Awaited<ReturnType<typeof services.admin.settings>>;
export function AdminSettingsPage(){
 const query=usePlatformQuery({key:'admin:settings',query:()=>services.admin.settings()});
 const [draft,setDraft]=useState<Settings>(),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 useEffect(()=>{if(query.data&&!dirty)setDraft(query.data);},[query.data,dirty]);
 async function save(e:FormEvent){e.preventDefault();if(!draft||busy)return;setBusy(true);setError('');setNotice('');try{setDraft(await services.admin.updateSettings(draft));setDirty(false);setNotice('Platforma parametrləri saxlanıldı.');}catch{setError('Parametrlər saxlanılmadı. Səlahiyyətinizi və bağlantını yoxlayın.');}finally{setBusy(false);}}
 return <><PageHeader title="Admin parametrləri" description="Qeydiyyat və platformanın əlaqə məlumatları. Yalnız baş administrator dəyişə bilər."/>{notice&&<Toast title={notice}/>}{error&&<p role="alert">{error}</p>}{query.loading?<LoadingSkeleton variant="form" rows={3}/>:query.error&&!draft?<p role="alert">Parametrlər yüklənmədi. Bu bölmə üçün baş administrator səlahiyyəti tələb olunur.</p>:draft&&<form className="settings-panel" onSubmit={save}><div className="settings-section"><Input label="Dəstək emaili" type="email" required value={draft.supportEmail} onChange={e=>{setDraft({...draft,supportEmail:e.target.value});setDirty(true);}}/><Switch label="Yeni komanda qeydiyyatı açıqdır" checked={draft.registrationEnabled} onChange={()=>{setDraft({...draft,registrationEnabled:!draft.registrationEnabled});setDirty(true);}}/><Textarea label="Platforma elanı" maxLength={500} value={draft.maintenanceMessage} onChange={e=>{setDraft({...draft,maintenanceMessage:e.target.value});setDirty(true);}}/></div><footer className="settings-savebar"><span>{dirty?'Saxlanılmamış dəyişikliklər':'Cari parametrlər'}</span><Button type="submit" disabled={!dirty} loading={busy}>Saxla</Button></footer></form>}</>;
}
