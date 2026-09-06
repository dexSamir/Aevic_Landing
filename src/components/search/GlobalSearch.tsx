import { Search, X } from 'lucide-react';
import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { services } from '../../services';
import type { SearchResultItem, SearchResults } from '../../types/domain';
import { safeInternalPath } from '../../utils/routes';
import { Button, EmptyState, IconButton, LoadingSkeleton } from '../common/primitives';

const groupLabels = { team: 'KOMANDALAR', tournament: 'TURNİRLƏR', record: 'REKORDLAR' } as const;

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [results, setResults] = useState<SearchResults>({ query: '', groups: {} });
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const requestIdRef = useRef(0);
  const navigate = useNavigate();
  const publicGroups = useMemo(() => Object.fromEntries(Object.entries(results.groups).filter(([group]) => group !== 'player')), [results]);
  const items = useMemo(() => Object.values(publicGroups).flat().filter(Boolean) as SearchResultItem[], [publicGroups]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setOpen(true); }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      window.setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }
    previousFocusRef.current?.focus();
  }, [open]);
  useEffect(() => {
    const query = value.trim();
    const requestId = ++requestIdRef.current;
    setActive(0);
    setFailed(false);
    if (query.length < 2) { setResults({ query, groups: {} }); setLoading(false); return; }
    setLoading(true);
    const timer = window.setTimeout(() => {
      services.search.public(query)
        .then((nextResults) => { if (requestId === requestIdRef.current) setResults(nextResults); })
        .catch(() => { if (requestId === requestIdRef.current) setFailed(true); })
        .finally(() => { if (requestId === requestIdRef.current) setLoading(false); });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [attempt, value]);
  const choose = (item: SearchResultItem) => { const path = safeInternalPath(item.href); if (!path) { setFailed(true); return; } setOpen(false); setValue(''); navigate(path); };
  const onDialogKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])') ?? [])];
    if (!focusable.length) return;
    const first = focusable[0]; const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  return <>
    <button className="global-search-trigger" type="button" onClick={() => setOpen(true)} aria-label="Global axtarışı aç"><Search size={17} /><span>Axtar</span><kbd>⌘K</kbd></button>
    {open && <div className="global-search-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section ref={dialogRef} className="global-search" role="dialog" aria-modal="true" aria-labelledby="global-search-title" onKeyDown={onDialogKeyDown}>
        <header><Search size={20} /><label htmlFor="global-search-input" id="global-search-title" className="sr-only">AEVIC-də axtar</label><input ref={inputRef} id="global-search-input" type="search" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Komanda, turnir və ya rekord" autoComplete="off" onKeyDown={(event) => {
          if (event.key === 'ArrowDown') { event.preventDefault(); setActive((index) => Math.min(items.length - 1, index + 1)); }
          if (event.key === 'ArrowUp') { event.preventDefault(); setActive((index) => Math.max(0, index - 1)); }
          if (event.key === 'Enter' && items[active]) { event.preventDefault(); choose(items[active]); }
        }} /><IconButton label="Axtarışı bağla" onClick={() => setOpen(false)}><X size={19} /></IconButton></header>
        <div className="global-search__results" aria-live="polite">{loading ? <LoadingSkeleton rows={4} /> : value.trim().length < 2 ? <p className="global-search__hint">Axtarış üçün ən azı 2 simvol yazın.</p> : failed ? <EmptyState title="Axtarış yüklənmədi" body="Public axtarış servisi cavab vermədi." action={<Button variant="secondary" onClick={() => setAttempt((value) => value + 1)}>Yenidən cəhd et</Button>} /> : !items.length ? <EmptyState title="Nəticə tapılmadı" body="Başqa ad və ya daha qısa sorğu sınayın." /> : Object.entries(publicGroups).map(([group, groupItems]) => Boolean(groupItems?.length) && <section key={group}><h2>{groupLabels[group as keyof typeof groupLabels]}</h2>{groupItems!.map((item) => { const index = items.findIndex((candidate) => candidate.id === item.id && candidate.type === item.type); return <button key={`${item.type}-${item.id}`} type="button" className={index === active ? 'is-active' : ''} onMouseEnter={() => setActive(index)} onClick={() => choose(item)}><span><strong>{item.title}</strong><small>{item.subtitle}</small></span><em>{groupLabels[item.type as keyof typeof groupLabels]}</em></button>; })}</section>)}</div>
        <footer><span>↑↓ Seç</span><span>Enter Aç</span><span>Esc Bağla</span></footer>
      </section>
    </div>}
  </>;
}
