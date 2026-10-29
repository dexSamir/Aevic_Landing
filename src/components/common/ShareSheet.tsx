import { useEffect, useRef, useState } from 'react';
import { Copy, Download, MessageCircle, Send, Share2 } from 'lucide-react';
import { Button, Modal } from './primitives';
import './share-sheet.css';
import type { ProfileCardFormat } from '../../types/domain';

export function ShareSheet({ open, onClose, title, url, createFile, formats = false, initialFormat = 'square' }: { open:boolean; onClose:()=>void; title:string; url:string; createFile?:(format?:ProfileCardFormat)=>Promise<File>; formats?:boolean; initialFormat?:ProfileCardFormat }) {
  const [format, setFormat] = useState<ProfileCardFormat>(initialFormat);
  const lock = useRef(false);
  const generation = useRef(0);
  const [file, setFile] = useState<File>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => { generation.current++; setFile(undefined); setNotice(''); }, [open, createFile, format]);
  useEffect(() => { if(open) setFormat(initialFormat); }, [open, initialFormat]);
  const run = async (action:()=>Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setNotice('');
    try { await action(); }
    catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) setNotice('Əməliyyat tamamlanmadı. Yenidən cəhd edin və ya linki kopyalayın.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const download = () => {
    if (!file) return;
    const href = URL.createObjectURL(file), link = document.createElement('a');
    link.href = href; link.download = file.name; link.click();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
  };
  const nativeFiles = file && typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files:[file] });
  return <Modal open={open} onClose={onClose} title="Paylaş">
    <div className="share-sheet"><p>{title}</p>
      {!createFile && typeof navigator.share === 'function' && <Button variant="secondary" disabled={busy} icon={<Share2 size={18}/>} onClick={() => void run(() => navigator.share({ title, url }))}>Digər tətbiqlər · link</Button>}
      <div className="share-sheet-links"><a href={`https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={18}/>WhatsApp</a><a href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`} target="_blank" rel="noopener noreferrer"><Send size={18}/>Telegram</a></div>
      <Button variant="secondary" disabled={busy} icon={<Copy size={18}/>} onClick={() => void run(async () => { await navigator.clipboard.writeText(url); setNotice('Link kopyalandı.'); })}>Linki kopyala</Button>
      <details className="share-link-details"><summary>Linki göstər</summary><input aria-label="Paylaşım linki" readOnly value={url} onFocus={event => event.target.select()}/></details>
      {createFile && <div className="share-sheet-image">
        {formats && <label className="share-format">Şəkil formatı<select aria-label="Şəkil formatı" value={format} disabled={busy} onChange={event=>setFormat(event.target.value as ProfileCardFormat)}><option value="square">Standart · 1:1</option><option value="portrait">Instagram post · 4:5</option><option value="story">Story / WhatsApp Status · 9:16</option></select></label>}
        {!file ? <Button loading={busy} icon={<Share2 size={18}/>} onClick={() => void run(async () => { const version = generation.current; const image = await createFile(formats ? format : undefined); if (!image.size || image.type !== 'image/png') throw new Error('Invalid image'); if(version === generation.current) setFile(image); })}>Paylaşım şəklini hazırla</Button> : <>
          {nativeFiles && <Button disabled={busy} icon={<Share2 size={18}/>} onClick={() => void run(() => navigator.share({ title, files:[file] }))}>Şəkli tətbiqdə paylaş</Button>}
          <Button variant="secondary" icon={<Download size={18}/>} onClick={download}>PNG-ni yüklə</Button>
        </>}
        <p>WhatsApp və Telegram link paylaşır. Şəkil paylaşarkən tətbiqi cihaz menyusundan seçin. Şəkli saxlamaq üçün PNG-ni ayrıca yükləyin.</p>
      </div>}
      <p role="status" aria-live="polite">{notice}</p>
    </div>
  </Modal>;
}
