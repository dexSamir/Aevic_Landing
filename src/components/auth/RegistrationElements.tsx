import { AlertTriangle, Check, CheckCircle2, ChevronDown, Clock3, Cloud, LoaderCircle, Pencil, ShieldCheck, UserCheck } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { KnownPlayerLookup, RegistrationPlayerDraft, TeamRegistrationState } from '../../types/domain';
import { Button } from '../common/primitives';

const registrationSteps = ['Komanda', 'Kapitan', 'Heyət', 'Yoxlama'] as const;

export type DraftSaveStatus = 'idle' | 'saving' | 'saved';

export function RegistrationStepper({ currentStep, saveStatus = 'idle' }: { currentStep: number; saveStatus?: DraftSaveStatus }) {
  const progress = (currentStep / registrationSteps.length) * 100;
  return (
    <nav className="registration-stepper" aria-label="Qeydiyyat addımları">
      <div className="registration-stepper__meta">
        <span>Addım {currentStep} / {registrationSteps.length}</span>
        <span className={`draft-save-status draft-save-status--${saveStatus}`} role="status">{saveStatus === 'saving' ? <LoaderCircle className="spin" size={14} /> : <Cloud size={14} />}{saveStatus === 'saving' ? 'Qaralama saxlanılır…' : saveStatus === 'saved' ? 'Qaralama bu cihazda saxlanıldı' : `${Math.round(progress)}%`}</span>
      </div>
      <div className="registration-stepper__track" aria-hidden="true"><span style={{ transform: `scaleX(${progress / 100})` }} /></div>
      <ol>
        {registrationSteps.map((label, index) => {
          const number = index + 1;
          const state = number < currentStep ? 'completed' : number === currentStep ? 'active' : 'upcoming';
          return (
            <li className={`registration-step registration-step--${state}`} aria-current={state === 'active' ? 'step' : undefined} key={label}>
              <span>{state === 'completed' ? <Check size={14} aria-hidden="true" /> : String(number).padStart(2, '0')}</span>
              <strong>{label}</strong>
              <small className="sr-only">{state === 'completed' ? 'Tamamlandı' : state === 'active' ? 'Cari addım' : 'Növbəti addım'}</small>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function RosterProgress({ players }: { players: RegistrationPlayerDraft[] }) {
  const required = players.slice(0, 4);
  const completed = required.filter((player) => player.ign.trim()).length;
  return <div className="roster-progress"><div><span>Əsas heyət</span><strong>{completed} / {required.length} oyunçu əlavə olunub</strong></div><span className="roster-progress__track" role="progressbar" aria-label="Əsas heyətin tamamlanması" aria-valuemin={0} aria-valuemax={required.length} aria-valuenow={completed}><i style={{ transform: `scaleX(${completed / required.length})` }} /></span></div>;
}

export function RegistrationPreviewRoster({ players }: { players: RegistrationPlayerDraft[] }) {
  const starters = players.slice(0, 4);
  return <div className="registration-preview-roster"><header><span>Əsas heyət</span><strong>{starters.filter((player) => player.ign.trim()).length} / 4</strong></header><ol>{starters.map((player, index) => <li className={player.ign.trim() ? 'is-complete' : ''} key={index}><span>{index === 0 ? 'C' : 'P'}</span><strong>{player.ign.trim() || 'Oyunçu tələb olunur'}</strong>{player.ign.trim() && <Check size={14} aria-label="Əlavə edilib" />}</li>)}</ol>{players[4]?.ign.trim() && <p><span>E</span><strong>{players[4].ign}</strong><small>Əvəzedici</small></p>}</div>;
}

export function RegistrationTeamPreview({ step, teamName, tag, captainName, players, logoUrl, tournamentName, availability = 'idle' }: { step: number; teamName: string; tag: string; captainName: string; players: RegistrationPlayerDraft[]; logoUrl?: string; tournamentName: string; availability?: 'idle' | 'checking' | 'available' | 'unavailable' | 'error' }) {
  const [expanded, setExpanded] = useState(false);
  const mainCount = players.slice(0, 4).filter((player) => player.ign.trim()).length;
  const substituteCount = players[4]?.ign.trim() ? 1 : 0;
  const ready = Boolean(teamName.trim() && captainName.trim() && mainCount === 4);
  const identity = teamName.trim() || 'Komanda adı';
  return <aside className={`registration-team-preview ${expanded ? 'is-expanded' : ''} ${teamName ? 'has-data' : ''}`} aria-label="Komanda kimliyinin canlı önizləməsi">
    <button className="registration-team-preview__toggle" type="button" aria-expanded={expanded} aria-controls="registration-preview-content" onClick={() => setExpanded((value) => !value)}><span className="registration-team-preview__mini-mark">{logoUrl ? <img src={logoUrl} alt="" /> : tag.slice(0, 3) || identity.slice(0, 2).toUpperCase()}</span><span><strong>{identity}</strong><small>{mainCount} / 4 əsas heyət</small></span><ChevronDown size={18} /></button>
    <div id="registration-preview-content" className="registration-team-preview__content">
      <header><span>{step === 4 ? 'Yoxlama üçün hazırdır' : 'Komanda önizləməsi'}</span>{availability === 'available' && <small><CheckCircle2 size={13} />Ad mövcuddur</small>}</header>
      <div className="registration-team-preview__identity"><div className="registration-team-preview__mark">{logoUrl ? <img src={logoUrl} alt={`${identity} loqosu önizləməsi`} /> : tag.slice(0, 3) || identity.slice(0, 2).toUpperCase()}</div><div>{teamName ? <h3>{teamName}</h3> : <><span className="preview-skeleton preview-skeleton--title" /><span className="preview-skeleton" /></>}<p>{tag || 'TEAM TAG'} · AEVIC COMPETITIVE</p></div></div>
      <div className="registration-team-preview__tournament"><span>Qeydiyyat</span><strong>{tournamentName}</strong></div>
      {step >= 2 && <dl><div><dt>Kapitan</dt><dd>{captainName || 'Ad gözlənilir'}</dd></div><div><dt>Əsas heyət</dt><dd>{mainCount} / 4</dd></div></dl>}
      {step >= 3 && <RegistrationPreviewRoster players={players} />}
      {step === 4 && <footer><span className={ready ? 'is-ready' : ''}><ShieldCheck size={17} />{ready ? 'Kimlik tamamdır' : 'Məlumat tamamlanmalıdır'}</span><small>Əvəzedici: {substituteCount}</small></footer>}
    </div>
  </aside>;
}

export const TeamIdentityPreview = RegistrationTeamPreview;

export function TeamAvailabilityStatus({ state }: { state: 'idle' | 'checking' | 'available' | 'unavailable' | 'error' }) {
  if (state === 'idle') return null;
  const copy = state === 'checking' ? 'Ad yoxlanılır…' : state === 'available' ? 'Komanda adı mövcuddur.' : state === 'unavailable' ? 'Bu komanda adı artıq istifadə olunur.' : 'Yoxlama tamamlanmadı; göndərmə zamanı yenidən yoxlanacaq.';
  return <p className={`team-availability team-availability--${state}`} role="status">{state === 'checking' ? <LoaderCircle className="spin" size={15} /> : state === 'available' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}{copy}<small>Nümunə adapteri · real mühitdə server qərarı əsasdır</small></p>;
}

export function PlayerLookupResult({ player, onUse, disabled = false }: { player: KnownPlayerLookup; onUse: () => void; disabled?: boolean }) {
  return <div className="player-lookup-result"><UserCheck size={18} /><div><span>Oyunçu tapıldı</span><strong>{player.ign}</strong><small>{player.previousAppearances} əvvəlki AEVIC iştirakı · nümunə qeyd</small></div><Button type="button" variant="ghost" onClick={onUse} disabled={disabled}>{disabled ? 'İstifadə edilə bilməz' : 'Nick-i istifadə et'}</Button></div>;
}

export interface SmartReviewCheck {
  id: string;
  label: string;
  state: 'complete' | 'warning' | 'error';
  step?: number;
  fieldId?: string;
}

export function SmartReview({ checks, onResolve }: { checks: SmartReviewCheck[]; onResolve: (check: SmartReviewCheck) => void }) {
  return <section className="smart-review"><header><ShieldCheck size={19} /><div><span>Qeydiyyat yoxlaması</span><strong>{checks.filter((check) => check.state === 'complete').length} / {checks.length} yoxlama tamamdır</strong></div></header><ul>{checks.map((check) => <li className={`smart-review__item smart-review__item--${check.state}`} key={check.id}>{check.state === 'complete' ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}<span>{check.label}</span>{check.step && check.state !== 'complete' && <button type="button" onClick={() => onResolve(check)}>Düzəlt</button>}</li>)}</ul></section>;
}

const registrationStatusCopy: Record<TeamRegistrationState, { label: string; detail: string }> = {
  draft: { label: 'Qaralama', detail: 'Məlumatlar hələ göndərilməyib.' },
  submitted: { label: 'Göndərilib', detail: 'Qeydiyyat qəbul edildi və yoxlama növbəsinə əlavə olundu.' },
  'under-review': { label: 'Yoxlanılır', detail: 'Komanda və heyət məlumatları administrator tərəfindən yoxlanılır.' },
  approved: { label: 'Təsdiqlənib', detail: 'Komanda açıq turnirlərə qoşula bilər.' },
  rejected: { label: 'Rədd edilib', detail: 'Düzəliş tələb edən səbəbi yoxlayın.' },
};

export function RegistrationStatusPanel({ status, reason, nextStep }: { status: TeamRegistrationState; reason?: string; nextStep?: string }) {
  const copy = registrationStatusCopy[status];
  return <section className={`registration-status-panel registration-status-panel--${status}`} aria-label="Qeydiyyat statusu"><div><span>Qeydiyyat statusu</span><strong><i aria-hidden="true" />{copy.label}</strong></div><p>{reason || copy.detail}</p>{nextStep && <div className="registration-status-panel__next"><Clock3 size={16} /><span>{nextStep}</span></div>}</section>;
}

export function RegistrationSectionTitle({ step, title, body }: { step: number; title: string; body: string }) {
  return <div className="form-section-title"><span>{String(step).padStart(2, '0')}</span><div><h2>{title}</h2><p>{body}</p></div></div>;
}

export function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <section className="review-section">
      <header><h3>{title}</h3><Button type="button" variant="ghost" icon={<Pencil size={15} />} onClick={onEdit}>Düzəliş et</Button></header>
      <dl>{children}</dl>
    </section>
  );
}

export function ReviewRow({ label, value }: { label: string; value: ReactNode }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}
