import { mediaUploadError } from '../../services/mediaUploadError';
import { ImageEditor } from '../common/ImageEditor';
import { brandAssetGuidance } from '../../services/brandAssetValidation';
import { useState, useRef, useEffect } from 'react';
import { FileUpload, Button } from '../common/primitives';
import { services } from '../../services';
import { invalidateQuery, updateCachedQuery } from '../../services/queryCache';
import type { TeamPlatformSnapshot } from '../../types/domain';
export default function TeamMediaPreview({ teamId, onPreview }: { teamId: string; onPreview: (type: 'logo' | 'banner', url: string) => void }) {
 const upload=useRef<AbortController|undefined>(undefined);
 useEffect(()=>()=>upload.current?.abort(),[]);
 const [editing,setEditing]=useState<{file:File;type:'logo'|'banner'}>();
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const publish=async(file:File,assetType:'logo'|'banner')=>{
  if(busy)return;const controller=new AbortController();upload.current=controller;setBusy(true);setError('');setNotice('');let bitmap:ImageBitmap|undefined;
  try{
   bitmap=await createImageBitmap(file);
   const result=await services.media.uploadBrandAsset({ownerType:'team',ownerId:teamId,assetType,fileName:file.name,mimeType:file.type,sizeBytes:file.size,width:bitmap.width,height:bitmap.height},file,controller.signal);
   onPreview(assetType,result.previewUrl);updateCachedQuery<TeamPlatformSnapshot>('snapshot:team',v=>({...v,currentTeam:{...v.currentTeam,[assetType==='logo'?'logoUrl':'bannerUrl']:result.previewUrl}}));invalidateQuery('profile:');invalidateQuery('snapshot:public');setNotice(assetType==='logo'?'Loqo saxlanıldı.':'Banner saxlanıldı.');
  }catch(error){if(controller.signal.aborted)setNotice('Yükləmə dayandırıldı. Son vəziyyəti görmək üçün səhifəni yeniləyin.');else setError(mediaUploadError(error));}finally{bitmap?.close();setBusy(false);}
 };
 return <div><p>Banner: 1600 × 500 px (16:5). Tam kəsim ölçüsü qorunur; profilin hündürlüyü ekran ölçüsünə görə dəyişir.</p>{error&&<p role="alert" className="field__error">{error}</p>}{notice&&<p role="status">{notice}</p>}<div className="form-grid"><FileUpload disabled={busy} label="Komanda loqosu" accept={['image/png','image/jpeg','image/webp']} maxBytes={4_000_000} preview="none" hint="Tövsiyə: 1024 × 1024 px · 1:1 · PNG, JPG, WebP · 4 MB" onFile={file=>setEditing({file,type:'logo'})} /><FileUpload disabled={busy} label="Komanda banneri" accept={['image/png','image/jpeg','image/webp']} maxBytes={4_000_000} preview="none" hint="Tövsiyə: 1600 × 500 px · 16:5 · PNG, JPG, WebP · 4 MB" onFile={file=>setEditing({file,type:'banner'})} /></div>{editing&&<ImageEditor file={editing.file} fit="cover" width={editing.type==='banner'?brandAssetGuidance.teamBanner.recommendedWidth:1024} height={editing.type==='banner'?brandAssetGuidance.teamBanner.recommendedHeight:1024} title={editing.type==='banner'?'Komanda bannerini düzəlt':'Komanda loqosunu düzəlt'} onCancel={()=>setEditing(undefined)} onApply={file=>{const type=editing.type;setEditing(undefined);void publish(file,type);}} />}{busy&&<div><p role="status">Şəkil yüklənir…</p><Button variant="secondary" onClick={()=>upload.current?.abort()}>Yükləməni dayandır</Button></div>}</div>;
}
