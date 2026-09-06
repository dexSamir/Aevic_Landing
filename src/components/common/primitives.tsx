import '../../styles/components.css';
import { sanitizeInternalPath, sanitizeOutboundUrl } from '../../utils/outboundUrl';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Copy,
  Eye,
  EyeOff,
  Info,
  LoaderCircle,
  Upload,
  X,
} from 'lucide-react';
import {
  Fragment,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
export { TeamLogo, TeamMark, TeamLogoTile, TeamRosterReveal } from './TeamIdentity';
import { Link } from 'react-router-dom';
import { competitionNow } from '../../services';
import type { Notification, TeamApprovalStatus } from '../../types/domain';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'text' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', loading, icon, children, className = '', disabled, type = 'button', ...props }: ButtonProps) {
  return (
    <button type={type} className={`button button--${variant} button--${size} ${className}`} disabled={disabled || loading} {...props}>
      {loading ? <LoaderCircle aria-hidden="true" className="spin" size={18} /> : icon}
      <span>{loading ? 'Gözləyin…' : children}</span>
    </button>
  );
}

export function IconButton({ label, children, className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return <button type={type} className={`icon-button ${className}`} aria-label={label} title={label} {...props}>{children}</button>;
}

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  success?: string;
  optional?: boolean;
}

export function Input({ label, hint, error, success, optional, id: providedId, className = '', ...props }: InputHTMLAttributes<HTMLInputElement> & FieldProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const descriptionId = `${id}-description`;
  return (
    <label className={`field ${error ? 'field--error' : ''} ${success ? 'field--success' : ''} ${className}`} htmlFor={id}>
      <span className="field__label">{label}{optional && <span>İstəyə bağlı</span>}</span>
      <input id={id} aria-invalid={Boolean(error)} aria-describedby={(error || hint || success) ? descriptionId : undefined} {...props} />
      {(error || success || hint) && <span id={descriptionId} className="field__message" role={error ? 'alert' : undefined}>{error || success || hint}</span>}
    </label>
  );
}

export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement> & FieldProps) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const descriptionId = `${id}-description`;
  const { label, hint, error, success, optional, ...inputProps } = props;
  return (
    <div className={`field password-field ${error ? 'field--error' : ''} ${success ? 'field--success' : ''}`}>
      <label className="field__label" htmlFor={id}>{label}{optional && <span>İstəyə bağlı</span>}</label>
      <span className="password-field__control">
        <input {...inputProps} id={id} aria-invalid={Boolean(error)} aria-describedby={(error || hint || success) ? descriptionId : undefined} type={visible ? 'text' : 'password'} />
        <IconButton type="button" className="password-field__toggle" label={visible ? 'Şifrəni gizlət' : 'Şifrəni göstər'} onClick={() => setVisible((value) => !value)}>
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </IconButton>
      </span>
      {(error || success || hint) && <span id={descriptionId} className="field__message" role={error ? 'alert' : undefined}>{error || success || hint}</span>}
    </div>
  );
}

type PhoneInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & FieldProps & {
  value?: string;
  onValueChange?: (normalizedValue: string) => void;
};

export function normalizeAzerbaijanPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  const local = (digits.startsWith('994') ? digits.slice(3) : digits).slice(0, 9);
  return local ? `+994${local}` : '';
}

function formatAzerbaijanPhone(value: string) {
  const local = normalizeAzerbaijanPhone(value).slice(4);
  return [local.slice(0, 2), local.slice(2, 5), local.slice(5, 7), local.slice(7, 9)].filter(Boolean).join(' ');
}

export function PhoneInput({ label, hint, error, success, optional, id: providedId, value = '', onValueChange, ...props }: PhoneInputProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const descriptionId = `${id}-description`;
  return (
    <label className={`field phone-field ${error ? 'field--error' : ''} ${success ? 'field--success' : ''}`} htmlFor={id}>
      <span className="field__label">{label}{optional && <span>İstəyə bağlı</span>}</span>
      <span className="phone-field__control">
        <span aria-hidden="true">+994</span>
        <input
          {...props}
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="50 555 01 07"
          value={formatAzerbaijanPhone(value)}
          aria-invalid={Boolean(error)}
          aria-describedby={(error || hint || success) ? descriptionId : undefined}
          onChange={(event) => onValueChange?.(normalizeAzerbaijanPhone(event.currentTarget.value))}
        />
      </span>
      {(error || success || hint) && <span id={descriptionId} className="field__message" role={error ? 'alert' : undefined}>{error || success || hint}</span>}
    </label>
  );
}

export function Select({ label, hint, error, id: providedId, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & FieldProps & { children: ReactNode }) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const descriptionId = `${id}-description`;
  return (
    <label className={`field ${error ? 'field--error' : ''}`} htmlFor={id}>
      <span className="field__label">{label}</span>
      <span className="field__select"><select id={id} aria-invalid={Boolean(error)} aria-describedby={(error || hint) ? descriptionId : undefined} {...props}>{children}</select><ChevronDown aria-hidden="true" size={18} /></span>
      {(error || hint) && <span id={descriptionId} className="field__message" role={error ? 'alert' : undefined}>{error || hint}</span>}
    </label>
  );
}

export function Switch({ label, description, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; description?: string }) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  return <label className="switch" htmlFor={id}><span><strong>{label}</strong>{description && <small>{description}</small>}</span><input {...props} id={id} type="checkbox" role="switch" /><i aria-hidden="true" /></label>;
}

export function Textarea({ label, hint, error, id: providedId, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const descriptionId = `${id}-description`;
  return (
    <label className={`field ${error ? 'field--error' : ''}`} htmlFor={id}>
      <span className="field__label">{label}</span>
      <textarea id={id} aria-invalid={Boolean(error)} aria-describedby={(error || hint) ? descriptionId : undefined} {...props} />
      {(error || hint) && <span id={descriptionId} className="field__message" role={error ? 'alert' : undefined}>{error || hint}</span>}
    </label>
  );
}

export function Checkbox({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  return <label className="check" htmlFor={id}><input {...props} id={id} type="checkbox" /><span className="check__box"><Check size={14} /></span><span>{label}</span></label>;
}

export function Radio({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  return <label className="radio" htmlFor={id}><input {...props} id={id} type="radio" /><span className="radio__dot" /><span>{label}</span></label>;
}

export { FileUpload } from './FileUpload';

export function StatusBadge({ status, children }: { status: TeamApprovalStatus | 'open' | 'live' | 'locked' | 'released' | 'checked-in' | 'draft' | 'completed' | 'warning'; children?: ReactNode }) {
  const labels: Record<string, string> = {
    pending: 'Gözləyir', approved: 'Təsdiqlənib', rejected: 'Rədd edilib', banned: 'Bloklanıb',
    open: 'Qeydiyyat açıqdır', live: 'Canlı', locked: 'Kilidlidir', released: 'Açılıb',
    'checked-in': 'Check-in tamamdır', draft: 'Qaralama', completed: 'Tamamlanıb', warning: 'Diqqət',
  };
  return <span className={`status status--${status}`}><span className="status__dot" />{children ?? labels[status]}</span>;
}

export function ProgressBar({ value, max = 100, label }: { value: number; max?: number; label?: string }) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(safeMax, value)) : 0;
  const percent = Math.round((safeValue / safeMax) * 100);
  return (
    <div className="progress" aria-label={label || 'Tamamlanma göstəricisi'} role="progressbar" aria-valuemin={0} aria-valuemax={safeMax} aria-valuenow={safeValue}>
      {label && <div className="progress__meta"><span>{label}</span><strong>{value}/{max}</strong></div>}
      <span className="progress__track"><span style={{ width: `${percent}%` }} /></span>
    </div>
  );
}

function timeLeft(target: string) {
  const difference = Math.max(0, new Date(target).getTime() - competitionNow().getTime());
  return {
    days: Math.floor(difference / 86_400_000),
    hours: Math.floor((difference / 3_600_000) % 24),
    minutes: Math.floor((difference / 60_000) % 60),
    seconds: Math.floor((difference / 1_000) % 60),
  };
}

export function Countdown({ target, compact = false }: { target: string; compact?: boolean }) {
  const [value, setValue] = useState(() => timeLeft(target));
  useEffect(() => {
    const timer = window.setInterval(() => setValue(timeLeft(target)), 1000);
    return () => window.clearInterval(timer);
  }, [target]);
  const items = compact ? [['saat', value.hours], ['dəq', value.minutes], ['san', value.seconds]] : [['gün', value.days], ['saat', value.hours], ['dəq', value.minutes], ['san', value.seconds]];
  return <div className={`countdown ${compact ? 'countdown--compact' : ''}`} aria-label="Qalan vaxt">{items.map(([label, number], index) => <span key={`${label}-${index}`}><strong>{String(number).padStart(2, '0')}</strong><small>{label}</small></span>)}</div>;
}

export function CopyButton({ value, label = 'Kopyala' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return <Button variant="ghost" icon={copied ? <CheckCircle2 size={17} /> : <Copy size={17} />} onClick={async () => { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }}>{copied ? 'Kopyalandı' : label}</Button>;
}

export function PageHeader({ eyebrow, title, description, actions, className = '' }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode; className?: string }) {
  return <header className={`page-header ${className}`.trim()}><div className="page-header__copy">{eyebrow && <span className="page-header__eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="page-header__actions">{actions}</div>}</header>;
}

export function SectionHeading({ title, description, action, headingId }: { title: string; description?: string; action?: ReactNode; headingId?: string }) {
  return <div className="section-heading"><div><h2 id={headingId}>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>;
}

export function EmptyState({ icon, title, body, action, heading = 'h2' }: { icon?: ReactNode; title: string; body: string; action?: ReactNode; heading?: 'h1' | 'h2' | 'h3' }) {
  const Heading = heading;
  return <div className="empty-state">{icon ?? <Info size={28} />}<Heading>{title}</Heading><p>{body}</p>{action}</div>;
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return <div className="skeleton" role="status" aria-busy="true" aria-label="Məlumat yüklənir">{Array.from({ length: rows }, (_, index) => <span key={index} />)}</div>;
}

export function Toast({ tone = 'success', title, body, onClose }: { tone?: 'success' | 'error' | 'info'; title: string; body?: string; onClose?: () => void }) {
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'error' ? CircleAlert : Info;
  return <div className={`toast toast--${tone}`} role={tone === 'error' ? 'alert' : 'status'}><Icon size={20} /><div><strong>{title}</strong>{body && <p>{body}</p>}</div>{onClose && <IconButton label="Bildirişi bağla" onClick={onClose}><X size={18} /></IconButton>}</div>;
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return <span className="tooltip" data-tooltip={label}>{children}</span>;
}

export function Tabs({ items, active, onChange, label = 'Bölmələr' }: { items: { id: string; label: string; count?: number; panelId?: string }[]; active: string; onChange: (id: string) => void; label?: string }) {
  const tablistRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ overflow: false, start: true, end: true });
  const updateScrollState = () => {
    const tablist = tablistRef.current;
    if (!tablist) return;
    const maximum = Math.max(0, tablist.scrollWidth - tablist.clientWidth);
    setScrollState({ overflow: maximum > 1, start: tablist.scrollLeft <= 1, end: tablist.scrollLeft >= maximum - 1 });
  };
  const reveal = (tab?: HTMLButtonElement | null) => {
    tab?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
    window.requestAnimationFrame(updateScrollState);
  };
  useEffect(() => {
    const tablist = tablistRef.current;
    if (!tablist) return;
    const frame = window.requestAnimationFrame(() => { reveal([...tablist.querySelectorAll<HTMLButtonElement>('[data-tab-id]')].find((tab) => tab.dataset.tabId === active)); updateScrollState(); });
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(updateScrollState);
    observer?.observe(tablist);
    return () => { window.cancelAnimationFrame(frame); observer?.disconnect(); };
  }, [active, items.length]);
  const moveFocus = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    const movement = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : movement ? (index + movement + items.length) % items.length : -1;
    if (nextIndex < 0) return;
    const tablist = tablistRef.current;
    event.preventDefault(); onChange(items[nextIndex].id);
    window.requestAnimationFrame(() => { const nextTab = tablist?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]; nextTab?.focus(); reveal(nextTab); });
  };
  return <div ref={tablistRef} className="tabs" role="tablist" aria-label={label} data-overflow={scrollState.overflow} data-scroll-start={scrollState.start} data-scroll-end={scrollState.end} onScroll={updateScrollState}>{items.map((item, index) => <button key={item.id} data-tab-id={item.id} type="button" role="tab" aria-selected={active === item.id} aria-controls={item.panelId} tabIndex={active === item.id ? 0 : -1} onFocus={(event) => reveal(event.currentTarget)} onKeyDown={(event) => moveFocus(event, index)} onClick={(event) => { onChange(item.id); reveal(event.currentTarget); }}>{item.label}{item.count !== undefined && <span>{item.count}</span>}</button>)}</div>;
}

export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) {
  return <nav className="pagination" aria-label="Səhifələmə"><IconButton label="Əvvəlki səhifə" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={18} /></IconButton><span>{page} / {pages}</span><IconButton label="Növbəti səhifə" disabled={page >= pages} onClick={() => onChange(page + 1)}><ChevronRight size={18} /></IconButton></nav>;
}

export function DataTable({ headers, rows, caption, cutAfterRow, cutLabel }: { headers: string[]; rows: ReactNode[][]; caption?: string; cutAfterRow?: number; cutLabel?: string }) {
  return <div className="data-table-wrap"><table className="data-table">{caption && <caption>{caption}</caption>}<thead><tr>{headers.map((header, index) => <th key={`${header}-${index}`} scope="col">{header}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <Fragment key={rowIndex}><tr>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>{cutAfterRow === rowIndex + 1 && cutLabel && <tr className="qualification-cut"><td colSpan={headers.length}><span>{cutLabel}</span></td></tr>}</Fragment>)}</tbody></table></div>;
}

export function MobileDataList({ items }: { items: { title: ReactNode; meta?: ReactNode; value?: ReactNode; details?: ReactNode }[] }) {
  return <div className="mobile-data-list">{items.map((item, index) => <article key={index}><div><strong>{item.title}</strong>{item.meta && <span>{item.meta}</span>}</div>{item.value && <b>{item.value}</b>}{item.details && <div className="mobile-data-list__details">{item.details}</div>}</article>)}</div>;
}

export function NotificationItem({ item }: { item: Notification }) {
  const Icon = item.severity === 'critical' ? AlertTriangle : item.severity === 'success' ? CheckCircle2 : Info;
  const internal = sanitizeInternalPath(item.actionHref);
  const external = sanitizeOutboundUrl(item.actionHref);
  const action = item.actionLabel ? internal ? <Link to={internal}>{item.actionLabel}</Link> : external ? <a href={external} target="_blank" rel="noopener noreferrer">{item.actionLabel}</a> : null : null;
  return <article className={`notification-item ${item.read ? '' : 'notification-item--unread'}`}><span className="notification-item__icon"><Icon size={18} /></span><div><div className="notification-item__top"><h3>{item.title}</h3><time>{new Date(item.createdAt).toLocaleDateString('az-AZ', { day: '2-digit', month: 'short' })}</time></div><p>{item.body}</p>{action}</div></article>;
}

function useExitPresence(open: boolean) {
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(open);
  const frameRef = useRef<number | undefined>(undefined);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (open) {
      setRendered(true);
      frameRef.current = window.requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      timerRef.current = window.setTimeout(() => setRendered(false), 240);
    }
    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [open]);

  return { rendered, visible };
}

export function Modal({ open, title, children, onClose, footer }: { open: boolean; title: string; children: ReactNode; onClose: () => void; footer?: ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { rendered, visible } = useExitPresence(open);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    window.requestAnimationFrame(() => (panelRef.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panelRef.current)?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) { event.preventDefault(); panelRef.current.focus(); return; }
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus(); };
  }, [open, onClose]);
  if (!rendered) return null;
  return <div className="modal-backdrop" data-state={visible ? 'open' : 'closed'} aria-hidden={!open} role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><div className="modal" role="dialog" aria-modal={open ? true : undefined} aria-labelledby={titleId} tabIndex={-1} ref={panelRef}><header><h2 id={titleId}>{title}</h2><IconButton label="Pəncərəni bağla" onClick={onClose}><X size={20} /></IconButton></header><div className="modal__body">{children}</div>{footer && <footer>{footer}</footer>}</div></div>;
}

export function ConfirmDialog({ open, title, body, confirmLabel, tone = 'danger', onConfirm, onClose }: { open: boolean; title: string; body: string; confirmLabel: string; tone?: 'danger' | 'primary'; onConfirm: () => void | Promise<void>; onClose: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  useEffect(() => { if (!open) setError(''); }, [open]);
  const close = () => { if (!busy.current) onClose(); };
  const confirm = async () => {
    if (busy.current) return;
    busy.current = true; setPending(true); setError('');
    try { await onConfirm(); }
    catch { setError('Əməliyyat təsdiqlənmədi. Vəziyyəti yoxlayıb yenidən cəhd edin.'); }
    finally { busy.current = false; setPending(false); }
  };
  return <Modal open={open} title={title} onClose={close} footer={<><Button disabled={pending} variant="ghost" onClick={close}>Ləğv et</Button><Button disabled={pending} loading={pending} variant={tone} onClick={() => void confirm()}>{confirmLabel}</Button></>}><p>{body}</p>{error && <p role="alert">{error}</p>}</Modal>;
}

export function Drawer({ id, open, title, children, onClose }: { id?: string; open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  const panelRef = useRef<HTMLElement>(null);
  const { rendered, visible } = useExitPresence(open);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    document.body.classList.add('drawer-open');
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) { event.preventDefault(); panelRef.current.focus(); return; }
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handler);
    window.requestAnimationFrame(() => panelRef.current?.focus());
    return () => { document.body.classList.remove('drawer-open'); document.removeEventListener('keydown', handler); previous?.focus(); };
  }, [open, onClose]);
  if (!rendered) return null;
  return <div className="drawer-backdrop" data-state={visible ? 'open' : 'closed'} aria-hidden={!open} onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><aside id={id} ref={panelRef} tabIndex={-1} className="drawer" role="dialog" aria-modal={open ? true : undefined} aria-label={title}><header><strong>{title}</strong><IconButton label="Menyunu bağla" onClick={onClose}><X size={20} /></IconButton></header>{children}</aside></div>;
}
