import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { Button, FileUpload } from '../common/primitives';
import { demoMode, services } from '../../services';
import { invalidateQuery, updateCachedQuery } from '../../services/queryCache';
import type { TeamPlatformSnapshot } from '../../types/domain';
import { prepareBrandImage } from '../../utils/prepareBrandImage';
const LogoEditor = lazy(() => import('../auth/TeamLogoEditor').then(module => ({ default: module.TeamLogoEditor })));
export default function TeamMediaPreview({ teamId, onPreview }: { teamId: string; onPreview: (type: 'logo' | 'banner', url: string) => void }) {
  const urls = useRef<Partial<Record<'logo' | 'banner', string>>>({});
  const [logoFile,setLogoFile]=useState<File>(); const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');
  useEffect(() => () => { Object.values(urls.current).forEach(url => URL.revokeObjectURL(url)); }, []);
  const publish = async (type:'logo'|'banner',file:File) => {
    if(busy)return;setBusy(true);setError('');setNotice('');
    let bitmap:ImageBitmap|undefined;
    try {
      file=await prepareBrandImage(file,type);
      bitmap=await createImageBitmap(file);
      const result=await services.media.uploadBrandAsset({ownerType:'team',ownerId:teamId,assetType:type,fileName:file.name,mimeType:file.type,sizeBytes:file.size,width:bitmap.width,height:bitmap.height},file);
      const url=demoMode?URL.createObjectURL(file):result.previewUrl;
      if(urls.current[type])URL.revokeObjectURL(urls.current[type]!);if(demoMode)urls.current[type]=url;
      onPreview(type,url);setLogoFile(undefined);
      if(!demoMode){updateCachedQuery<TeamPlatformSnapshot>('snapshot:team',v=>({...v,currentTeam:{...v.currentTeam,[type==='logo'?'logoUrl':'bannerUrl']:url}}));invalidateQuery('profile:');invalidateQuery('snapshot:public');}
      setNotice(demoMode?'Şəkil lokal önbaxışda göstərilir.':'Şəkil yükləndi və profilə əlavə edildi.');
    }catch{setError('Şəkil yüklənmədi. Formatı, ölçünü və bağlantını yoxlayın.');setLogoFile(undefined);}
    finally{bitmap?.close();setBusy(false);}
  };
  const remove=async(type:'logo'|'banner')=>{if(busy)return;setBusy(true);setError('');try{await services.media.deleteBrandAsset(teamId,type);onPreview(type,'');updateCachedQuery<TeamPlatformSnapshot>('snapshot:team',v=>({...v,currentTeam:{...v.currentTeam,[type==='logo'?'logoUrl':'bannerUrl']:undefined}}));invalidateQuery('profile:');invalidateQuery('snapshot:public');setNotice('Şəkil profildən silindi.');}catch{setError('Şəkil silinmədi. Yenidən cəhd edin.');}finally{setBusy(false);}};
  return <div>{error&&<p role="alert" className="field__error">{error}</p>}{notice&&<p role="status">{notice}</p>}<div className="form-grid">{(['logo', 'banner'] as const).map(type => <div key={type}><FileUpload disabled={busy} label={type === 'logo' ? 'Komanda loqosu' : 'Komanda banneri'} accept={['image/png', 'image/jpeg', 'image/webp']} maxBytes={6_000_000} hint={type==='logo'?'PNG, JPG, WebP · 512×512 minimum · 6 MB':'PNG, JPG, WebP · 960×300 minimum · 6 MB'} onFile={file => {if(busy)return;if(type==='logo')setLogoFile(file);else void publish(type,file);}} /><Button variant="ghost" disabled={busy} onClick={()=>void remove(type)}>{type==='logo'?'Loqonu sil':'Banneri sil'}</Button></div>)}</div>{busy&&<p role="status">Şəkil yüklənir…</p>}{logoFile&&<Suspense fallback={<p>Loqo redaktoru açılır…</p>}><LogoEditor file={logoFile} onApply={file=>void publish('logo',file)} onCancel={()=>setLogoFile(undefined)} /></Suspense>}</div>;
}
