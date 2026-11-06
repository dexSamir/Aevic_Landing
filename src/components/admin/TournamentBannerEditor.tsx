import { useEffect, useState } from 'react';
import { FileUpload } from '../common/FileUpload';
import { Button } from '../common/primitives';
import { mediaUploadError } from '../../services/mediaUploadError';
import { services } from '../../services';
import { officialAssets } from '../../assets/official';
import '../../styles/tournament-editor.css';

export function TournamentBannerEditor({value,onChange,onBusy,label='Turnir banneri'}:{label?:string;value?:string|null;onChange:(id:string|null)=>void;onBusy?:(busy:boolean)=>void}) {
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[preview,setPreview]=useState('');
 useEffect(()=>{const controller=new AbortController();let url='';setPreview('');setError('');
  if(value)services.tournaments.bannerPreview(value,controller.signal).then(blob=>{if(!controller.signal.aborted){url=URL.createObjectURL(blob);setPreview(url);}}).catch(()=>{if(!controller.signal.aborted)setError('Banner önbaxışı yüklənmədi. Faylı yenidən seçə bilərsiniz.');});
  return()=>{controller.abort();if(url)URL.revokeObjectURL(url);};
 },[value]);
 const upload=async(file:File)=>{
  setBusy(true);onBusy?.(true);setError('');
  try{const result=await services.tournaments.uploadBanner(file);onChange(result.id);}
  catch(e){setError(mediaUploadError(e));}
  finally{setBusy(false);onBusy?.(false);}
 };
 return <section className="tournament-banner-editor" aria-label={label} aria-busy={busy}>
  <div><h3>{label} <small>· istəyə bağlı</small></h3><p className="admin-field-hint">PNG, JPG və ya WebP · maksimum 4 MB · tövsiyə: 1920 × 600 px</p></div>
  <img className="tournament-banner-editor__image" src={preview||officialAssets.authBackdrop} alt={value?'Turnir bannerinin önbaxışı':'Standart AEVIC görünüşü'} width={1920} height={600}/>
  <div onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';}} onDrop={e=>{e.preventDefault();if(busy)return;const file=e.dataTransfer.files[0];if(!file)return;if(e.dataTransfer.files.length!==1||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>4_000_000||!file.size){setError('Bir PNG, JPG və ya WebP faylı seçin (maksimum 4 MB).');return;}void upload(file);}}>
   <FileUpload label={value?'Banneri dəyiş · faylı bura sürüklə':'Banner seç · faylı bura sürüklə'} accept={['image/png','image/jpeg','image/webp']} maxBytes={4_000_000} preview="none" disabled={busy} onFile={file=>void upload(file)}/>
  </div>
  {busy&&<div role="status"><progress aria-label="Banner yüklənir"/>Banner yüklənir…</div>}
  {error&&<p role="alert">{error}</p>}
  {value&&<Button variant="ghost" disabled={busy} onClick={()=>onChange(null)}>Banneri sil</Button>}
 </section>;
}
