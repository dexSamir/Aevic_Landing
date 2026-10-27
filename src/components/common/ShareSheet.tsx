import { useEffect, useState } from 'react';
import { Copy, Download, MessageCircle, Send, Share2 } from 'lucide-react';
import { Button, Modal } from './primitives';
import './share-sheet.css';

export function ShareSheet({ open, onClose, title, url, createFile }: { open:boolean; onClose:()=>void; title:string; url:string; createFile?:()=>Promise<File> }) {
  const [file, setFile] = useState<File>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => { setFile(undefined); setNotice(''); }, [open, createFile]);
  const run = async (action:()=>Promise<void>) => {
    if (busy) return;
    setBusy(true); setNotice('');
    try { await action(); }
    catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) setNotice('Əməliyyat tamamlanmadı. Yenidən cəhd edin və ya linki kopyalayın.'); }
    finally { setBusy(false); }
  };
  const download = () => {
    if (!file) return;
    const href = URL.createObjectURL(file), link = document.createElement('a');
    link.href = href; link.download = file.name; link.click();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
  };
  const nativeFiles = file && typeof navigator.canShare === 'function' && navigator.canShare({ files:[file] });
  return <Modal open={open} onClose={onClose} title="Paylaş">
    <div className="share-sheet"><p>{title}</p>
      {typeof navigator.share === 'function' && <Button variant="secondary" disabled={busy} icon={<Share2 size={18}/>} onClick={() => void run(() => navigator.share({ title, url }))}>Digər tətbiqlər · link</Button>}
      <div className="share-sheet-links"><a href={`https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={18}/>WhatsApp</a><a href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`} target="_blank" rel="noopener noreferrer"><Send size={18}/>Telegram</a></div>
      <Button variant="secondary" disabled={busy} icon={<Copy size={18}/>} onClick={() => void run(async () => { await navigator.clipboard.writeText(url); setNotice('Link kopyalandı.'); })}>Linki kopyala</Button>
      <input aria-label="Paylaşım linki" readOnly value={url} onFocus={event => event.target.select()}/>
      {createFile && <div className="share-sheet-image">
        {!file ? <Button loading={busy} icon={<Share2 size={18}/>} onClick={() => void run(async () => { const image = await createFile(); if (!image.size || image.type !== 'image/png') throw new Error('Invalid image'); setFile(image); })}>Paylaşım şəklini hazırla</Button> : <>
          {nativeFiles && <Button disabled={busy} icon={<Share2 size={18}/>} onClick={() => void run(() => navigator.share({ title, files:[file] }))}>Şəkli tətbiqdə paylaş</Button>}
          <Button variant="secondary" icon={<Download size={18}/>} onClick={download}>PNG-ni yüklə</Button>
        </>}
        <p>Instagram Story və ya post üçün şəkli yükləyib Instagram-da seçin. Uyğun telefonda “Şəkli tətbiqdə paylaş” seçimi də işləyə bilər. WhatsApp və Telegram düymələri yalnız link paylaşır.</p>
      </div>}
      <p role="status" aria-live="polite">{notice}</p>
    </div>
  </Modal>;
}
