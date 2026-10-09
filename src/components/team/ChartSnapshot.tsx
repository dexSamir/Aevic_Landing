import { Download } from 'lucide-react';
import { useId, useRef, useState, type ReactNode } from 'react';
import { downloadPng, renderPng } from '../../utils/pngExport';

export function ChartSnapshot({ title, subtitle, filename, children, disabled = false, className = '' }: {
  title: string; subtitle: string; filename: string; children: ReactNode; disabled?: boolean; className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const busy = useRef(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const titleId = useId();
  const exportChart = async () => {
    if (!ref.current || busy.current) return;
    busy.current = true; setExporting(true); setError('');
    try { downloadPng(await renderPng(ref.current), `aevic-${filename}.png`); }
    catch { setError('PNG hazırlanmadı. Yenidən cəhd edin.'); }
    finally { busy.current = false; setExporting(false); }
  };
  return <article ref={ref} className={`insight-chart ${className}`} aria-labelledby={titleId}>
    <header><div><h3 id={titleId}>{title}</h3><p>{subtitle}</p></div><button data-export-exclude type="button" className="chart-download" aria-label={`${title} — PNG yüklə`} data-tooltip="PNG yüklə" disabled={disabled || exporting} aria-busy={exporting} onClick={() => void exportChart()}><Download size={17} aria-hidden="true" /></button></header>
    {error && <p data-export-exclude role="alert">{error}</p>}
    {exporting && <span data-export-exclude role="status" className="sr-only">PNG hazırlanır…</span>}
    {children}
    <footer className="chart-signature">AEVIC <span>· Dərc edilmiş rəsmi nəticələr</span></footer>
  </article>;
}
