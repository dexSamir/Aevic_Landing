import {
Pencil
} from 'lucide-react';
import { useState } from 'react';
import {
Button,
FileUpload,
Input,
Modal,
PageHeader,
TeamLogo,
Toast
} from '../../components/common/primitives';
import { services } from '../../services';
import { useTeamPlatformData } from '../../services/PlatformDataContext';
import { invalidateQuery,updateCachedQuery } from '../../services/queryCache';
import type { TeamPlatformSnapshot } from '../../types/domain';

export function TeamRosterPage() {
  const {currentTeam}=useTeamPlatformData();
  const [selected,setSelected]=useState<number>(),[ign,setIgn]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const refresh=(team:typeof currentTeam)=>{updateCachedQuery<TeamPlatformSnapshot>('snapshot:team',v=>({...v,currentTeam:team}));invalidateQuery('snapshot:public');invalidateQuery('profile:');};
  const save=async()=>{if(!selected||busy)return;setBusy(true);setError('');try{refresh(await services.teams.updateRosterSlot(currentTeam.id,selected,ign));setSelected(undefined);setNotice('Oyunçu adı saxlanıldı.');}catch{setError('Dəyişiklik saxlanılmadı. Yenidən cəhd edin.');}finally{setBusy(false);}};
  const upload=async(file:File)=>{if(!selected||busy)return;setBusy(true);setError('');try{await services.media.uploadPlayerPhoto(currentTeam.id,selected,file);refresh(await services.teams.current());setNotice('Oyunçu şəkli saxlanıldı.');}catch{setError('Şəkil yüklənmədi. Formatı, ölçünü və bağlantını yoxlayın.');}finally{setBusy(false);}};
  return <><PageHeader eyebrow="Heyət nəzarəti" title="Heyət" description="Komandanın beş oyunçu yeri, oyunçu adları və şəkilləri." />{notice&&<Toast title={notice} />}<section className="roster-group"><h2>OYUNÇULAR</h2><div className="roster-management">{[1,2,3,4,5].map(slot=>{const player=currentTeam.roster.find(p=>p.id===`${currentTeam.id}:player${slot}`);return <article key={slot}><span className="roster-number">{String(slot).padStart(2,'0')}</span><TeamLogo name={player?.ign||'Oyunçu'} src={player?.photoUrl} /><div><strong>{player?.ign||'Boş yer'}</strong><span>{slot===5?'Ehtiyat oyunçu':'Əsas heyət'}</span></div><Button variant="ghost" icon={<Pencil size={16}/>} onClick={()=>{setSelected(slot);setIgn(player?.ign||'');setError('');}}>Dəyiş</Button></article>;})}</div></section><Modal open={selected!==undefined} title={`Oyunçu ${selected??''}`} onClose={()=>{if(!busy)setSelected(undefined);}} footer={<Button loading={busy} disabled={selected!==5&&ign.trim().length<2} onClick={()=>void save()}>Saxla</Button>}><div className="modal-form">{error&&<p role="alert" className="field__error">{error}</p>}<Input label="Oyunçu IGN" maxLength={40} value={ign} disabled={busy} onChange={e=>setIgn(e.target.value)} /><FileUpload label="Oyunçu şəkli" accept={['image/png','image/jpeg','image/webp']} maxBytes={4_000_000} disabled={busy} hint="PNG, JPG, WebP · 4 MB · Şəklin nisbəti saxlanılır" onFile={file=>void upload(file)} /></div></Modal></>;
}
