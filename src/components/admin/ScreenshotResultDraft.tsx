import { useEffect, useState } from 'react';
import { Button, Input } from '../common/primitives';
import { screenshotResult } from '../../utils/screenshotResult';

type VerifiedFields = { placement: number; kills: number };

export function ScreenshotResultDraft({ teamName, onVerify, disabled }: {
  teamName: string;
  onVerify: (fields: VerifiedFields) => void;
  disabled: boolean;
}) {
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState('');
  const [draft, setDraft] = useState({ placement: '', kills: '' });
  const [status, setStatus] = useState('');
  const [reading, setReading] = useState(false);

  useEffect(() => {
    if (!file) return;
    const controller = new AbortController();
    const url = URL.createObjectURL(file);
    setPreview(url);
    setReading(true);
    setStatus('Şəkil cihazda oxunur…');
    async function read(image: File) {
      try {
        const { readResultScreenshot } = await import('../../utils/readResultScreenshot');
        const text = await readResultScreenshot(image, controller.signal);
        if (controller.signal.aborted) return;
        const fields = screenshotResult(text);
        setDraft(fields);
        setStatus(fields.placement && fields.kills
          ? 'Komandanı və oxunan dəyərləri şəkillə yoxlayın.'
          : 'Komandanı şəkillə yoxlayın və boş sahələri əllə doldurun.');
      } catch {
        if (!controller.signal.aborted) setStatus('Şəkli avtomatik oxumaq mümkün olmadı. Dəyərləri əllə daxil edin.');
      } finally {
        if (!controller.signal.aborted) setReading(false);
      }
    }
    void read(file);
    return () => { controller.abort(); URL.revokeObjectURL(url); };
  }, [file]);

  const valid = /^\d+$/.test(draft.placement) && Number(draft.placement) >= 1 && Number(draft.placement) <= 100
    && /^\d+$/.test(draft.kills) && Number(draft.kills) <= 400;
  return <section className="operation-form screenshot-result-draft" aria-label="Şəkildən nəticə qaralaması">
    <h2>Şəkildən qaralama</h2>
    <p>{teamName} üçün bir komandanın nəticə şəklini seçin.</p>
    <Input label="Nəticə şəkli (PNG və ya JPEG, 10 MB)" type="file" accept="image/png,image/jpeg" disabled={disabled}
      onChange={event => {
        const next = event.target.files?.[0];
        if (!next) return;
        event.target.value = '';
        setPreview(''); setDraft({ placement: '', kills: '' }); setReading(false);
        if (!['image/png', 'image/jpeg'].includes(next.type) || next.size > 10 * 1024 * 1024) {
          setFile(undefined); setStatus('10 MB-a qədər PNG və ya JPEG şəkli seçin.'); return;
        }
        setFile(next);
      }} />
    {status && <p role="status">{status}</p>}
    {file && preview && <>
      <img src={preview} alt={teamName + ' üçün yoxlanılan nəticə şəkli'} />
      <div className="form-grid">
        <Input label="Qaralama yerləşməsi" type="number" min={1} max={100} disabled={reading || disabled}
          value={draft.placement} onChange={event => setDraft({ ...draft, placement: event.target.value })} />
        <Input label="Qaralama komanda kill sayı" type="number" min={0} max={400} disabled={reading || disabled}
          value={draft.kills} onChange={event => setDraft({ ...draft, kills: event.target.value })} />
      </div>
      <Button type="button" variant="secondary" disabled={!valid || reading || disabled}
        onClick={() => {
          onVerify({ placement: Number(draft.placement), kills: Number(draft.kills) });
          setStatus('Yoxlanmış dəyərlər formaya köçürüldü.');
        }}>Şəkillə yoxladım, formaya köçür</Button>
    </>}
  </section>;
}
