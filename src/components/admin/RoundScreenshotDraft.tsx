import { FileImage, UploadCloud, CheckCheck } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { RoundDraftFields, RoundResult } from '../../types/domain';
import { Button } from '../common/primitives';
import type { Participant } from '../../utils/roundScreenshot';
import { draftRow, mergeScreenshot, savedDraftRows, validateRoundDraft, type DraftRow } from '../../utils/roundResultDraft';

type Source = { id: string; name: string; url: string; status: string };
type Props = {
  participants: Participant[];
  saved: RoundResult[];
  busy: boolean;
  onSave: (rows: RoundDraftFields[], expected: RoundDraftFields[]) => Promise<void>;
  onCancel: () => void;
};

export function RoundScreenshotDraft({ participants, saved, busy, onSave, onCancel }: Props) {
  const uploadId=useId();
  const [dragging,setDragging]=useState(false);
  const [expected] = useState(() => saved.map(({ teamId, placement, finishes }) => ({ teamId, placement, finishes })));
  const [rows, setRows] = useState(() => savedDraftRows(saved));
  const [sources, setSources] = useState<Source[]>([]);
  const [reading, setReading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [notice, setNotice] = useState('');
  const active = useRef<AbortController | null>(null);
  const urls = useRef(new Map<string, string>());
  useEffect(() => {
    const previews = urls.current;
    return () => { active.current?.abort(); previews.forEach(url => URL.revokeObjectURL(url)); previews.clear(); };
  }, []);

  async function importFiles(files: File[]) {
    if (active.current || !files.length) return;
    const controller = new AbortController();
    active.current = controller;
    setVerified(false); setReading(true); setNotice('');
    const batch = new Map<File, string>();
    const messages: string[] = [];
    try {
      for (const file of files) {
        if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 10 * 1024 * 1024) {
          messages.push(file.name + ' — 10 MB-a qədər PNG və ya JPEG seçin.'); continue;
        }
        const bytes = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
        controller.signal.throwIfAborted();
        const id = Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2,'0')).join('');
        if (urls.current.has(id)) { messages.push(file.name + ' — bu şəkil artıq əlavə edilib.'); continue; }
        const url = URL.createObjectURL(file);
        urls.current.set(id, url); batch.set(file, id);
        setSources(old => [...old, { id, name: file.name, url, status: 'Oxunur…' }]);
      }
      if (batch.size) {
        const { readRoundScreenshots } = await import('../../utils/readResultScreenshot');
        await readRoundScreenshots([...batch.keys()], controller.signal, (file, result) => {
          const id = batch.get(file)!;
          setRows(old => mergeScreenshot(old, result.rows, id, participants));
          const status = result.layout === 'unsupported'
            ? 'Komanda cədvəli tanınmadı. Yer, komanda və kill sütunları görünən bir matç şəkli seçin və ya sətirləri əllə doldurun.'
            : result.rows.length + ' sətir oxundu.' + (result.layout === 'points' ? ' Sıra xala görədir. Matçdakı yerləşməni ayrıca yoxlayıb daxil edin.' : '');
          setSources(old => old.map(s => s.id === id ? { ...s, status } : s));
        }, participants);
      }
    } catch {
      if (!controller.signal.aborted) {
        messages.push('Şəkli oxumaq mümkün olmadı. Nəticələri əllə daxil edin.');
        setSources(old => old.map(s => s.status === 'Oxunur…' ? { ...s, status: 'Avtomatik oxunmadı.' } : s));
      }
    } finally {
      if (!controller.signal.aborted) { setNotice(messages.join(' ')); setReading(false); }
      active.current = null;
    }
  }

  const { missing, issues, valid } = validateRoundDraft(rows, participants);
  const locked = reading || busy;
  function edit(id: string, fields: Partial<Pick<DraftRow, 'teamId' | 'placement' | 'kills'>>) {
    setRows(old => old.map(row => row.id === id ? { ...row, ...fields } : row));
    setVerified(false);
  }

  return <section aria-labelledby="round-review-title" className="round-review screenshot-result-draft">
    <header className="results-review-heading"><div><span className="results-eyebrow">ŞƏKİLDƏN QARALAMAYA</span><h2 id="round-review-title">Raund nəticələrinin qaralaması</h2></div><span><CheckCheck size={15}/>Yalnız yoxlamadan sonra saxlanır</span></header>
    <ol className="results-review-steps" aria-label="Nəticə hazırlama mərhələləri"><li data-active={!rows.length}><b>1</b>Şəkilləri əlavə et</li><li data-active={!!rows.length&&!verified}><b>2</b>Uyğunlaşdır və yoxla</li><li data-active={verified}><b>3</b>Qaralamanı saxla</li></ol>
    <label className="results-dropzone" data-dragging={dragging} aria-disabled={locked} htmlFor={uploadId}
      onDragOver={event=>{event.preventDefault();if(!locked)setDragging(true);}} onDragLeave={()=>setDragging(false)}
      onDrop={event=>{event.preventDefault();setDragging(false);if(!locked)void importFiles(Array.from(event.dataTransfer.files));}}>
      <UploadCloud size={27}/><strong>Şəkilləri bura atın və ya fayl seçin</strong><span>Birdən çox PNG / JPEG · hər biri 10 MB-a qədər</span>
      <input className="sr-only" id={uploadId} type="file" multiple accept="image/jpeg,image/png" disabled={locked}
        aria-label="Raund şəkilləri (PNG və ya JPEG, hər biri 10 MB-a qədər)"
        onChange={event=>{const files=Array.from(event.target.files??[]);event.target.value='';void importFiles(files);}}/>
    </label>
    <div className="results-source-grid">{sources.map(source=><details className="results-source" key={source.id}>
      <summary><img className="results-source-thumb" src={source.url} alt=""/><FileImage size={16}/><span><strong>{source.name}</strong><small>{source.status}</small></span></summary>
      <img src={source.url} alt={source.name+' — yoxlama üçün mənbə'} loading="lazy"/>
    </details>)}</div>
    {reading && <p role="status">Şəkillər cihazda oxunur…</p>}
    {notice && <p role="status">{notice}</p>}
    {missing.length > 0 && <div className="results-review-missing">
      <p>Çatışmayan komandalar ({missing.length}): {missing.map(team => team.name).join(', ')}</p>
      <Button variant="secondary" disabled={locked} onClick={() => {
        setRows(old => [...old, ...missing.map(team => draftRow(team.id))]); setVerified(false);
      }}>Çatışmayan komandaları əlavə et</Button>
    </div>}
    {rows.length > 0 && <div className="results-table-scroll" tabIndex={0} role="region" aria-label="OCR nəticələrinin yoxlaması"><table className="round-review-table"><caption>Yoxlanılacaq komanda nəticələri</caption>
      <thead><tr><th>Şəkildə oxunan</th><th>Qeydiyyatlı komanda</th><th>Yerləşmə</th><th>Kill</th><th>Yoxlama</th></tr></thead>
      <tbody>{rows.map((row, index) => <tr key={row.id} data-invalid={issues.has(row.id)} data-uncertain={row.uncertain}>
        <td>{row.name || '—'}<small>{row.sources.map(id => sources.find(s => s.id === id)?.name).filter(Boolean).join(', ')}</small></td>
        <td><select aria-label={`Komanda, sətir ${index+1}`} value={row.teamId} disabled={locked} onChange={e => edit(row.id,{teamId:e.target.value})}>
          <option value="">Komandanı seçin</option>
          {participants.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
        </select></td>
        <td><input aria-label={`Yerləşmə, sətir ${index+1}`} type="number" min="1" max={participants.length} value={row.placement} disabled={locked}
          onChange={e => edit(row.id,{placement:e.target.value})} /></td>
        <td><input aria-label={`Kill, sətir ${index+1}`} type="number" min="0" max="400" value={row.kills} disabled={locked}
          onChange={e => edit(row.id,{kills:e.target.value})} /></td>
        <td>{issues.get(row.id)?.join(' · ') || (row.uncertain ? 'Şəkillə yoxlayın' : 'Hazırdır')}
          <Button variant="text" aria-label={`Sətir ${index+1} sil`} disabled={locked} onClick={() => {
            setRows(old => old.filter(r => r.id !== row.id)); setVerified(false);
          }}>Sil</Button>
        </td>
      </tr>)}</tbody>
    </table></div>}
    <label className="results-review-verify"><input type="checkbox" checked={verified} disabled={!valid || locked}
      onChange={e => setVerified(e.target.checked)} /> Komandaları, yerləşmələri və kill saylarını yoxladım.</label>
    <div className="admin-result-actions"><Button disabled={!valid || !verified || locked} loading={busy} onClick={() => {
      if (valid && verified && !locked) void onSave(rows.map(r => ({teamId:r.teamId, placement:Number(r.placement), finishes:Number(r.kills)})), expected);
    }}>Raund qaralamasını saxla</Button>
      <Button variant="secondary" disabled={busy} onClick={onCancel}>Saxlamadan bağla</Button>
    </div>
  </section>;
}
