import { useState } from 'react';
import { FileUpload } from '../common/primitives';
import { services } from '../../services';
import { invalidateQuery, updateCachedQuery } from '../../services/queryCache';
import type { TeamPlatformSnapshot } from '../../types/domain';
export default function TeamMediaPreview({ teamId, onPreview }: { teamId: string; onPreview: (type: 'logo' | 'banner', url: string) => void }) {
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const publish=async(file:File)=>{
  if(busy)return;setBusy(true);setError('');setNotice('');let bitmap:ImageBitmap|undefined;
  try{
   bitmap=await createImageBitmap(file);
   const result=await services.media.uploadBrandAsset({ownerType:'team',ownerId:teamId,assetType:'logo',fileName:file.name,mimeType:file.type,sizeBytes:file.size,width:bitmap.width,height:bitmap.height},file);
   onPreview('logo',result.previewUrl);updateCachedQuery<TeamPlatformSnapshot>('snapshot:team',v=>({...v,currentTeam:{...v.currentTeam,logoUrl:result.previewUrl}}));invalidateQuery('profile:');invalidateQuery('snapshot:public');setNotice('Loqo saxlanıldı.');
  }catch{setError('Şəkil yüklənmədi. Formatı, ölçünü və bağlantını yoxlayın.');}finally{bitmap?.close();setBusy(false);}
 };
 return <div>{error&&<p role="alert" className="field__error">{error}</p>}{notice&&<p role="status">{notice}</p>}<div className="form-grid"><FileUpload disabled={busy} label="Komanda loqosu" accept={['image/png','image/jpeg','image/webp']} maxBytes={4_000_000} hint="PNG, JPG, WebP · 4 MB · Şəklin nisbəti saxlanılır" onFile={file=>void publish(file)} /><FileUpload disabled label="Komanda banneri" hint="Banner saxlanması hazırda dəstəklənmir." onFile={()=>{}} /></div>{busy&&<p role="status">Şəkil yüklənir…</p>}</div>;
}
