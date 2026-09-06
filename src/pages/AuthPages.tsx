import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, ShieldCheck, Users } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlayerLookupResult, RegistrationSectionTitle, RegistrationStatusPanel, RegistrationStepper, RegistrationTeamPreview, ReviewRow, ReviewSection, RosterProgress, SmartReview, type SmartReviewCheck, TeamAvailabilityStatus, type DraftSaveStatus } from '../components/auth/RegistrationElements';
import { Button, Checkbox, FileUpload, Input, normalizeAzerbaijanPhone, PasswordInput, PhoneInput, Toast } from '../components/common/primitives';
import { serviceCapabilities, services } from '../services';
import { ApiError } from '../services/apiError';
import type { KnownPlayerLookup, RegistrationPlayerDraft, TeamRegistrationDraft, TeamRegistrationReceipt } from '../types/domain';
import { duplicatePubgIds, normalizePubgId } from '../utils/registration';
import { REGISTER_DRAFT_KEY, parseRegistrationDraft, registrationDraftPayload } from '../utils/registrationDraft';

function AuthHeader({ title, body }: { title: string; body: string }) {
  return <header className="auth-header"><span>{serviceCapabilities.login ? 'AEVIC secure access' : 'AEVIC hesabı'}</span><h1>{title}</h1><p>{body}</p></header>;
}

function AuthAvailabilityNotice({ registration = false, attempted = false }: { registration?: boolean; attempted?: boolean }) {
  return <aside id={registration ? 'register-capability-status' : 'login-capability-status'} className={`auth-availability ${attempted ? 'is-confirmed' : ''}`} role="status" aria-live="polite">
    <ShieldCheck size={20} aria-hidden="true" />
    <div><strong>{registration ? 'Komanda qeydiyyatı hazırda aktiv deyil.' : 'Hesaba giriş hazırda aktiv deyil.'}</strong>
      <p>{registration ? attempted ? 'Qaralamanız saxlanıldı. Son göndəriş ictimai baxış rejimində serverə ötürülmür.' : 'Formanı doldurub bütün addımları yoxlaya bilərsiniz. Yalnız son server göndərişi bağlıdır.' : attempted ? 'Məlumatlarınız olduğu kimi saxlanıldı. İctimai baxış rejimində serverə giriş sorğusu göndərilmir.' : 'İctimai baxış rejimində formanı sınaya bilərsiniz. Giriş sorğusu serverə göndərilməyəcək.'}</p>
      <Link to="/support">Dəstək və mövcud imkanlar <ArrowRight size={15} aria-hidden="true" /></Link>
    </div>
  </aside>;
}

export function LoginPage({ admin = false }: { admin?: boolean }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [unavailableAttempted, setUnavailableAttempted] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setError('');
    if (!serviceCapabilities.login) { setUnavailableAttempted(true); return; }
    setLoading(true);
    try { await services.auth.login(email, password, remember); navigate(admin ? '/admin' : '/team'); }
    catch (nextError) {
      if (nextError instanceof ApiError && nextError.code === 'ACCOUNT_LOCKED') setError('Hesab müvəqqəti kilidlənib. Dəstək xidməti ilə əlaqə saxlayın.');
      else if (nextError instanceof ApiError && nextError.kind === 'rate-limit') setError('Çox sayda giriş cəhdi edildi. Bir az sonra yenidən cəhd edin.');
      else setError('Daxil olmaq mümkün olmadı. Email və şifrəni yoxlayın.');
    }
    finally { setLoading(false); }
  };
  const fillDemoAccount = () => { setEmail(admin ? 'admin@example.test' : 'captain@example.test'); setPassword('demo-password'); };
  return <div className="auth-form-shell"><AuthHeader title={admin ? 'Admin girişi' : 'Komanda panelinə giriş'} body={admin ? 'Yarış əməliyyatları yalnız səlahiyyətli administratorlar üçündür.' : 'Təsdiq, slot, check-in, otaq və nəticələr bir paneldə.'} />{error && <Toast tone="error" title="Giriş alınmadı" body={error} />}<form className="auth-form" onSubmit={submit}><div className="auth-capability-fields"><Input label="E-poçt" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setUnavailableAttempted(false); }} autoComplete="email" required placeholder="captain@gmail.com" /><PasswordInput label="Şifrə" value={password} onChange={(event) => { setPassword(event.target.value); setUnavailableAttempted(false); }} autoComplete="current-password" required /><div className="form-inline"><Checkbox label="Məni xatırla" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><Link to="/forgot-password">Şifrəni unutmusunuz?</Link></div><Button type="submit" loading={loading} aria-describedby={!serviceCapabilities.login ? 'login-capability-status' : undefined}>{admin ? 'Admin panelini aç' : 'Daxil ol'}</Button>{!serviceCapabilities.login && <AuthAvailabilityNotice attempted={unavailableAttempted} />}</div></form>{serviceCapabilities.mockPreview && <button className="demo-account-fill" type="button" onClick={fillDemoAccount}>Demo hesabını doldur</button>}{serviceCapabilities.login && <div className="auth-note"><ShieldCheck size={19} /><p>{serviceCapabilities.mockPreview ? <><strong>Nümunə giriş aktivdir.</strong> Demo məlumatları yalnız siz seçdikdə formaya əlavə olunur.</> : <><strong>Təhlükəsiz giriş.</strong> Brauzerin parol meneceri və avtomatik doldurma funksiyasından istifadə edə bilərsiniz.</>}</p></div>}{!admin && <p className="auth-switch">Komandanız yoxdur? <Link to="/register">Komanda yaradın</Link></p>}</div>;
}

const defaultPlayers: RegistrationPlayerDraft[] = [
  { ign: '', uid: '', role: 'captain' },
  { ign: '', uid: '', role: 'starter' },
  { ign: '', uid: '', role: 'starter' },
  { ign: '', uid: '', role: 'starter' },
  { ign: '', uid: '', role: 'substitute' },
];
const defaultDraft: TeamRegistrationDraft = { teamName: '', tag: '', firstName: '', lastName: '', phone: '', email: '', players: defaultPlayers };

type TeamAvailabilityState = 'idle' | 'checking' | 'available' | 'unavailable' | 'error';
type PlayerCheck = { state: 'idle' | 'checking' | 'eligible' | 'unavailable' | 'error'; message?: string };

function restoreRegistrationDraft() {
  try {
    window.sessionStorage.removeItem('aevic-register-draft-v1');
    const stored = parseRegistrationDraft(window.sessionStorage.getItem(REGISTER_DRAFT_KEY));
    if (stored) return stored;
    window.sessionStorage.removeItem(REGISTER_DRAFT_KEY);
  } catch { /* Storage may be disabled; the form remains usable. */ }
  return { step: 1, draft: defaultDraft };
}

function getStepErrors(step: number, draft: TeamRegistrationDraft, password: string, confirmation: string, playerChecks: Record<number, PlayerCheck> = {}) {
  const errors: Record<string, string> = {};
  if (step === 1) {
    if (!draft.teamName.trim()) errors.teamName = 'Komanda adını daxil edin.';
  }
  if (step === 2) {
    if (!draft.firstName.trim()) errors.firstName = 'Kapitanın adını daxil edin.';
    if (!draft.lastName.trim()) errors.lastName = 'Kapitanın soyadını daxil edin.';
    if (!/^\+994\d{9}$/.test(normalizeAzerbaijanPhone(draft.phone))) errors.phone = '9 rəqəmli Azərbaycan mobil nömrəsi daxil edin.';
    if (!/^\S+@\S+\.\S+$/.test(draft.email.trim())) errors.email = 'Düzgün email ünvanı daxil edin.';
    if (!password) errors.password = 'Şifrəni daxil edin.';
    else if (password.length < 8 || !/[A-ZƏÖÜĞÇŞİ]/.test(password) || !/\d/.test(password)) errors.password = 'Aşağıdakı üç şərti tamamlayın.';
    if (!confirmation) errors.confirmation = 'Şifrəni təkrar daxil edin.';
    else if (confirmation !== password) errors.confirmation = 'Şifrələr uyğun gəlmir.';
  }
  if (step === 3) {
    const duplicates = duplicatePubgIds(draft.players);
    draft.players.forEach((player, index) => {
      if (index < 4 && !player.ign.trim()) errors[`player-${index}-ign`] = `Oyunçu ${index + 1} üçün oyunçu adını daxil edin.`;
      if (index < 4 && !player.uid) errors[`player-${index}-uid`] = `Oyunçu ${index + 1} üçün PUBG ID daxil edin.`;
      if (index === 4 && player.uid && !player.ign.trim()) errors[`player-${index}-ign`] = 'Ehtiyat oyunçu üçün nick daxil edin.';
      if (player.uid && !/^\d{8,15}$/.test(player.uid)) errors[`player-${index}-uid`] = 'PUBG ID 8–15 rəqəmdən ibarət olmalıdır.';
      else if (player.uid && duplicates.has(player.uid)) errors[`player-${index}-uid`] = 'Bu oyunçu artıq heyətə əlavə olunub.';
      else if (playerChecks[index]?.state === 'unavailable') errors[`player-${index}-uid`] = playerChecks[index].message ?? 'Bu oyunçu artıq başqa komandanın heyətində qeydiyyatdan keçib.';
    });
  }
  return errors;
}

function maskEmail(email: string) {
  const [name, domain] = email.split('@');
  if (!domain) return email;
  return `${name.slice(0, 2)}${'•'.repeat(Math.max(2, name.length - 2))}@${domain}`;
}

function maskPhone(phone: string) {
  const normalized = normalizeAzerbaijanPhone(phone);
  return normalized ? `${normalized.slice(0, 7)} ••• •• ${normalized.slice(-2)}` : '—';
}

function maskUid(uid: string) {
  return uid ? `${'•'.repeat(Math.max(4, uid.length - 4))}${uid.slice(-4)}` : 'Əlavə edilməyib';
}

export function RegisterPage() {
  const restored = useMemo(() => restoreRegistrationDraft(), []);
  const [step, setStep] = useState(restored.step);
  const [draft, setDraft] = useState<TeamRegistrationDraft>(restored.draft);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attemptedSteps, setAttemptedSteps] = useState<number[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [receipt, setReceipt] = useState<TeamRegistrationReceipt | null>(null);
  const [saveStatus, setSaveStatus] = useState<DraftSaveStatus>('idle');
  const [teamAvailability, setTeamAvailability] = useState<TeamAvailabilityState>('idle');
  const [playerChecks, setPlayerChecks] = useState<Record<number, PlayerCheck>>({});
  const [playerLookups, setPlayerLookups] = useState<Record<number, KnownPlayerLookup | undefined>>({});
  const [logoPreview, setLogoPreview] = useState('');
  const [openPlayer, setOpenPlayer] = useState(0);
  const [unavailableAttempted, setUnavailableAttempted] = useState(false);
  const [idempotencyKey] = useState(() => globalThis.crypto?.randomUUID?.() ?? `registration-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stepErrors = useMemo(() => getStepErrors(step, draft, password, confirmation, playerChecks), [step, draft, password, confirmation, playerChecks]);
  const passwordRequirements = [
    { label: 'Minimum 8 simvol', met: password.length >= 8 },
    { label: 'Ən azı bir böyük hərf', met: /[A-ZƏÖÜĞÇŞİ]/.test(password) },
    { label: 'Ən azı bir rəqəm', met: /\d/.test(password) },
  ];

  useEffect(() => {
    if (receipt || !draft.teamName.trim()) { setSaveStatus('idle'); return; }
    setSaveStatus('saving');
    const timer = window.setTimeout(() => {
      try { window.sessionStorage.setItem(REGISTER_DRAFT_KEY, JSON.stringify(registrationDraftPayload(draft, step))); setSaveStatus(Object.keys(stepErrors).length ? 'idle' : 'saved'); }
      catch { setSaveStatus('idle'); }
    }, 280);
    return () => window.clearTimeout(timer);
  }, [step, draft, receipt, stepErrors]);

  useEffect(() => {
    if (!serviceCapabilities.register) return;
    const name = draft.teamName.trim();
    if (name.length < 3) { setTeamAvailability('idle'); return; }
    setTeamAvailability('checking');
    let active = true;
    const timer = window.setTimeout(() => {
      services.registration.checkTeamName(name).then((result) => { if (active) setTeamAvailability(result.available ? 'available' : 'unavailable'); }).catch(() => { if (active) setTeamAvailability('error'); });
    }, 520);
    return () => { active = false; window.clearTimeout(timer); };
  }, [draft.teamName]);

  useEffect(() => () => { if (logoPreview) URL.revokeObjectURL(logoPreview); }, [logoPreview]);

  const errorFor = (field: string) => (touched[field] || attemptedSteps.includes(step)) ? stepErrors[field] : undefined;
  const touch = (field: string) => setTouched((current) => ({ ...current, [field]: true }));
  const updateDraft = <K extends keyof Omit<TeamRegistrationDraft, 'players'>>(field: K, value: TeamRegistrationDraft[K]) => setDraft((current) => ({ ...current, [field]: value }));
  const updatePlayer = (index: number, value: Partial<RegistrationPlayerDraft>) => setDraft((current) => ({ ...current, players: current.players.map((player, playerIndex) => playerIndex === index ? { ...player, ...value } : player) }));
  const goToStep = (nextStep: number) => {
    setStep(nextStep);
    setSubmitError('');
    setUnavailableAttempted(false);
    window.requestAnimationFrame(() => { scrollerRef.current?.scrollTo?.({ top: 0 }); window.scrollTo({ top: 0 }); });
  };
  const focusFirstError = (errors: Record<string, string>) => {
    const field = Object.keys(errors)[0];
    const playerIndex = field.match(/^player-(\d+)-/)?.[1];
    if (playerIndex) setOpenPlayer(Number(playerIndex));
    window.setTimeout(() => document.getElementById(field)?.focus(), 0);
  };
  const checkPlayer = async (index: number) => {
    if (!serviceCapabilities.register) return false;
    const uid = draft.players[index].uid;
    if (!uid || !/^\d{8,15}$/.test(uid) || duplicatePubgIds(draft.players).has(uid)) return true;
    setPlayerChecks((current) => ({ ...current, [index]: { state: 'checking' } }));
    try {
      const [eligibility, lookup] = await Promise.all([services.registration.validatePlayer(uid), services.registration.lookupPlayer(uid)]);
      setPlayerChecks((current) => ({ ...current, [index]: eligibility.eligible ? { state: 'eligible' } : { state: 'unavailable', message: 'Bu oyunçu artıq başqa komandanın aktiv heyətində qeydiyyatdan keçib.' } }));
      setPlayerLookups((current) => ({ ...current, [index]: eligibility.eligible ? lookup ?? undefined : undefined }));
      return eligibility.eligible;
    } catch {
      setPlayerChecks((current) => ({ ...current, [index]: { state: 'error', message: 'Oyunçu yoxlaması tamamlanmadı.' } }));
      return true;
    }
  };
  const validateRosterPlayers = async () => {
    const results = await Promise.all(draft.players.map((player, index) => player.uid ? checkPlayer(index) : Promise.resolve(true)));
    return results.every(Boolean);
  };
  const smartChecks = useMemo<SmartReviewCheck[]>(() => {
    const teamComplete = !Object.keys(getStepErrors(1, draft, password, confirmation)).length;
    const captainComplete = !Object.keys(getStepErrors(2, draft, password, confirmation)).length;
    const rosterErrors = getStepErrors(3, draft, password, confirmation, playerChecks);
    const duplicates = duplicatePubgIds(draft.players);
    const mainCount = draft.players.slice(0, 4).filter((player) => player.ign.trim()).length;
    const crossTeamConflict = Object.values(playerChecks).some((check) => check.state === 'unavailable');
    return [
      { id: 'team', label: teamComplete ? 'Komanda məlumatları tamamlandı' : 'Komanda məlumatlarında çatışmazlıq var', state: teamComplete ? 'complete' : 'error', step: 1, fieldId: 'teamName' },
      { id: 'name', label: teamAvailability === 'available' ? 'Komanda adı mövcuddur' : teamAvailability === 'unavailable' ? 'Komanda adı artıq istifadə olunur' : 'Komanda adı backend tərəfindən yenidən yoxlanacaq', state: teamAvailability === 'available' ? 'complete' : teamAvailability === 'unavailable' ? 'error' : 'warning', step: 1, fieldId: 'teamName' },
      { id: 'captain', label: captainComplete ? 'Kapitan məlumatları tamamlandı' : 'Kapitan məlumatlarını tamamlayın', state: captainComplete ? 'complete' : 'error', step: 2, fieldId: 'firstName' },
      { id: 'roster', label: `${mainCount} / 4 əsas oyunçu əlavə olunub`, state: mainCount === 4 ? 'complete' : 'error', step: 3, fieldId: `player-${mainCount}-ign` },
      { id: 'duplicates', label: duplicates.size ? 'Təkrarlanan PUBG ID aşkarlandı' : 'Təkrarlanan PUBG ID yoxdur', state: duplicates.size ? 'error' : 'complete', step: 3 },
      { id: 'eligibility', label: crossTeamConflict ? 'Aktiv turnir heyəti ilə ziddiyyət var' : Object.keys(rosterErrors).length ? 'Heyət qaydalarını tamamlayın' : 'Heyət qaydalara uyğundur', state: crossTeamConflict || Object.keys(rosterErrors).length ? 'error' : 'complete', step: 3 },
    ];
  }, [draft, password, confirmation, playerChecks, teamAvailability]);
  const renderPlayerEditor = (player: RegistrationPlayerDraft, index: number) => {
    const optional = index === 4;
    const ignError = errorFor(`player-${index}-ign`);
    const uidError = errorFor(`player-${index}-uid`);
    const complete = Boolean(player.ign.trim() && /^\d{8,15}$/.test(player.uid) && !ignError && !uidError && playerChecks[index]?.state !== 'unavailable');
    const error = ignError || uidError;
    const panelId = `roster-player-${index}-panel`;
    const triggerId = `roster-player-${index}-trigger`;
    return <article className={`roster-player ${openPlayer === index ? 'is-open' : ''} ${complete ? 'is-complete' : ''} ${error ? 'has-error' : ''}`} key={index}>
      <button id={triggerId} type="button" aria-expanded={openPlayer === index} aria-controls={panelId} onClick={() => setOpenPlayer(index)}>
        <span className="player-index">{optional ? 'E1' : `P${index + 1}`}</span>
        <span><strong>{optional ? 'Ehtiyat oyunçu' : index === 0 ? 'Kapitan / oyunçu 1' : `Əsas oyunçu ${index + 1}`}</strong><small>{error || (complete ? `${player.ign} · ••••${player.uid.slice(-4)}` : optional && !player.ign && !player.uid ? 'İstəyə bağlı' : player.ign || 'Məlumatları tamamlayın')}</small></span>
        {complete && <CheckCircle2 size={18} aria-label="Tamamlanıb" />}
        <ChevronDown size={18} aria-hidden="true" />
      </button>
      {openPlayer === index && <div id={panelId} role="region" aria-labelledby={triggerId} className="roster-player__fields">
        <Input id={`player-${index}-ign`} label={optional ? 'Ehtiyat oyunçu adı' : index === 0 ? 'Kapitan / oyunçu adı' : `Oyunçu ${index + 1} adı`} placeholder={optional ? 'SubstituteIGN' : index === 0 ? 'CaptainIGN' : `Starter ${index + 1}`} value={player.ign} onChange={(event) => updatePlayer(index, { ign: event.target.value })} onBlur={() => touch(`player-${index}-ign`)} error={ignError} optional={optional} required={!optional} />
        <Input id={`player-${index}-uid`} label="PUBG ID" placeholder="51234567890" value={player.uid} onChange={(event) => { updatePlayer(index, { uid: normalizePubgId(event.target.value) }); setPlayerChecks((current) => ({ ...current, [index]: { state: 'idle' } })); setPlayerLookups((current) => ({ ...current, [index]: undefined })); }} onBlur={() => { touch(`player-${index}-uid`); void checkPlayer(index); }} error={uidError} optional={optional} required={!optional} />
        {playerChecks[index]?.state === 'checking' && <p className="player-check-status" role="status">Oyunçu yoxlanılır…</p>}
        {playerLookups[index] && <PlayerLookupResult player={playerLookups[index]!} onUse={() => updatePlayer(index, { ign: playerLookups[index]!.ign })} />}
      </div>}
    </article>;
  };
  const resolveReviewIssue = (check: SmartReviewCheck) => {
    if (!check.step) return;
    goToStep(check.step);
    if (check.fieldId) window.setTimeout(() => document.getElementById(check.fieldId!)?.focus(), 80);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading || validating) return;
    setSubmitError('');
    if (step < 4) {
      if (Object.keys(stepErrors).length > 0) {
        setAttemptedSteps((current) => current.includes(step) ? current : [...current, step]);
        focusFirstError(stepErrors);
        return;
      }
      if (serviceCapabilities.register && step === 1 && teamAvailability !== 'available' && teamAvailability !== 'error') {
        setValidating(true);
        try {
          const result = await services.registration.checkTeamName(draft.teamName);
          setTeamAvailability(result.available ? 'available' : 'unavailable');
          if (!result.available) { setAttemptedSteps((current) => current.includes(1) ? current : [...current, 1]); document.getElementById('teamName')?.focus(); return; }
        } catch { setTeamAvailability('error'); }
        finally { setValidating(false); }
      }
      if (serviceCapabilities.register && step === 3) {
        setValidating(true);
        const eligible = await validateRosterPlayers();
        setValidating(false);
        if (!eligible) { setAttemptedSteps((current) => current.includes(3) ? current : [...current, 3]); setSubmitError('Heyətdəki PUBG ID ziddiyyətini həll edin.'); return; }
      }
      goToStep(step + 1);
      return;
    }
    if (!accepted) {
      setSubmitError('Göndərməzdən əvvəl məlumatları və turnir qaydalarını təsdiqləyin.');
      document.getElementById('register-terms')?.focus();
      return;
    }
    const firstBlockingCheck = smartChecks.find((check) => check.state === 'error');
    if (firstBlockingCheck) {
      setSubmitError('Göndərmədən əvvəl qeydiyyat yoxlamasındakı xətaları düzəldin.');
      resolveReviewIssue(firstBlockingCheck);
      return;
    }
    if (!serviceCapabilities.register) {
      setUnavailableAttempted(true);
      setSubmitError('Qaralama saxlanıldı. İctimai baxış rejimində son qeydiyyat serverə göndərilmir.');
      return;
    }
    setLoading(true);
    try {
      const result = await services.registration.submit({ draft, password, idempotencyKey });
      window.sessionStorage.removeItem(REGISTER_DRAFT_KEY);
      setPassword(''); setConfirmation(''); setReceipt(result);
    } catch {
      setSubmitError('Qeydiyyatı göndərmək mümkün olmadı. Məlumatlarınız qorunub — yenidən cəhd edin.');
    } finally {
      setLoading(false);
    }
  };

  if (receipt) return <div className="auth-form-shell auth-success"><CheckCircle2 size={42} /><span>Qeydiyyat qəbul edildi · demo adapter</span><h1>Komandanız yoxlamaya göndərildi.</h1><RegistrationStatusPanel status={receipt.status} nextStep="Admin yoxlamasından sonra turnirə qoşulma addımı açılacaq." /><p>Şifrə və digər həssas məlumatlar brauzer yaddaşında saxlanılmadı.</p><div><Link className="button button--primary" to="/team"><span>Demo paneli aç</span></Link><Link className="button button--ghost" to="/"><span>Ana səhifə</span></Link></div></div>;
  return <div className="register-shell"><AuthHeader title="Komandanı yarışa hazırla" body="Dörd qısa addım. Məlumatlar addımlar arasında qorunur və göndərilməzdən əvvəl yekun icmal göstərilir." /><RegistrationStepper currentStep={step} saveStatus={saveStatus} /><Button variant="ghost" type="button" disabled={loading} onClick={() => { window.sessionStorage.removeItem(REGISTER_DRAFT_KEY); setDraft(defaultDraft); setPassword(''); setConfirmation(''); setStep(1); setTouched({}); setAttemptedSteps([]); setAccepted(false); setSubmitError(''); setSaveStatus('idle'); setLogoPreview(''); setUnavailableAttempted(false); }}>Qaralamanı sil</Button><form className="auth-form register-form" noValidate onSubmit={submit}><div className="auth-capability-fields"><div className="register-workspace"><div className="register-workspace__form"><div className="register-workspace__scroller" ref={scrollerRef}>
    {step === 1 && <section><RegistrationSectionTitle step={1} title="Komanda kimliyi" body="Turnirlərdə və liderlik cədvəlində görünəcək əsas məlumatlar." /><div className="team-step-fields"><FileUpload label="Komanda loqosunu seç" hint="PNG, JPG və ya WebP · maksimum 4 MB" onFile={(file) => { if (logoPreview) URL.revokeObjectURL(logoPreview); setLogoPreview(URL.createObjectURL(file)); }} /><Input id="teamName" label="Komanda adı" placeholder="Nexus Esports" value={draft.teamName} onChange={(event) => updateDraft('teamName', event.target.value)} onBlur={() => touch('teamName')} error={errorFor('teamName') || (teamAvailability === 'unavailable' ? 'Bu komanda adı artıq istifadə olunur.' : undefined)} required /><TeamAvailabilityStatus state={teamAvailability} /><Input id="tag" label="Qısa tag" placeholder="NXS" value={draft.tag} onChange={(event) => updateDraft('tag', event.target.value.toUpperCase())} maxLength={5} optional /></div></section>}
    {step === 2 && <section><RegistrationSectionTitle step={2} title="Kapitan məlumatları" body="Təsdiq və oyun günü əlaqəsi üçün məsul şəxs." /><div className="form-grid"><Input id="firstName" label="Ad" placeholder="Murad" value={draft.firstName} onChange={(event) => updateDraft('firstName', event.target.value)} onBlur={() => touch('firstName')} error={errorFor('firstName')} autoComplete="given-name" required /><Input id="lastName" label="Soyad" placeholder="Məmmədov" value={draft.lastName} onChange={(event) => updateDraft('lastName', event.target.value)} onBlur={() => touch('lastName')} error={errorFor('lastName')} autoComplete="family-name" required /></div><div className="form-grid"><PhoneInput id="phone" label="WhatsApp nömrəsi" value={draft.phone} onValueChange={(value) => updateDraft('phone', value)} onBlur={() => touch('phone')} error={errorFor('phone')} required /><Input id="email" label="E-poçt" type="email" placeholder="captain@gmail.com" value={draft.email} onChange={(event) => updateDraft('email', event.target.value)} onBlur={() => touch('email')} error={errorFor('email')} autoComplete="email" required /></div><div className="form-grid password-grid"><div><PasswordInput id="password" label="Şifrə" value={password} onChange={(event) => setPassword(event.target.value)} onBlur={() => touch('password')} error={errorFor('password')} autoComplete="new-password" required /><ul className="password-requirements" aria-label="Şifrə tələbləri">{passwordRequirements.map((requirement) => <li className={requirement.met ? 'met' : ''} key={requirement.label}><CheckCircle2 size={15} aria-hidden="true" />{requirement.label}</li>)}</ul></div><PasswordInput id="confirmation" label="Şifrəni təsdiqlə" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} onBlur={() => touch('confirmation')} error={confirmation ? errorFor('confirmation') : attemptedSteps.includes(2) ? stepErrors.confirmation : undefined} success={confirmation && confirmation === password ? 'Şifrələr uyğun gəlir.' : undefined} autoComplete="new-password" required /></div></section>}
    {step === 3 && <section><RegistrationSectionTitle step={3} title="4 əsas oyunçu + 1 ehtiyat" body="Oyunçuları bir-bir tamamlayın. Bitmiş sətirlər yığılır, xətalar isə sətirin üzərində görünür." /><RosterProgress players={draft.players} /><div className="roster-players" aria-label="Heyət oyunçuları">{draft.players.map(renderPlayerEditor)}</div></section>}
    {step === 4 && <section className="registration-review"><RegistrationSectionTitle step={4} title="Yekun icmal" body="Göndərməzdən əvvəl məlumatları yoxlayın və lazım olan bölməyə birbaşa qayıdın." /><SmartReview checks={smartChecks} onResolve={resolveReviewIssue} /><div className="review-sections"><ReviewSection title="Komanda" onEdit={() => goToStep(1)}><ReviewRow label="Komanda adı" value={draft.teamName} /><ReviewRow label="Qısa tag" value={draft.tag || 'Əlavə edilməyib'} /></ReviewSection><ReviewSection title="Kapitan" onEdit={() => goToStep(2)}><ReviewRow label="Ad və soyad" value={`${draft.firstName} ${draft.lastName}`} /><ReviewRow label="WhatsApp" value={maskPhone(draft.phone)} /><ReviewRow label="E-poçt" value={maskEmail(draft.email)} /></ReviewSection><ReviewSection title="Heyət" onEdit={() => goToStep(3)}>{draft.players.map((player, index) => <ReviewRow key={`${player.ign}-${index}`} label={index === 4 ? 'Ehtiyat · optional' : `P${index + 1} · ${player.role}`} value={<>{player.ign || 'Əlavə edilməyib'}<small>{maskUid(player.uid)}</small></>} />)}</ReviewSection></div><div className="approval-explainer"><Users size={22} /><div><strong>Təsdiq turnir slotu deyil.</strong><p>Komanda təsdiqləndikdən sonra ayrıca açıq turnirə qoşulmalı və slot mövcudluğu yoxlanmalıdır.</p></div></div><Checkbox id="register-terms" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} label={<>Məlumatların düzgün olduğunu və <Link to="/regulations">turnir qaydalarını</Link> qəbul edirəm.</>} /></section>}
    {submitError && <p className="register-submit-error" role="alert">{submitError}</p>}
    </div>{!serviceCapabilities.register && step === 4 && <AuthAvailabilityNotice registration attempted={unavailableAttempted} />}<footer className="register-actions">{step > 1 ? <Button type="button" variant="ghost" icon={<ArrowLeft size={17} />} onClick={() => goToStep(step - 1)} disabled={loading || validating}>Geri</Button> : <span />}<Button type="submit" icon={<ArrowRight size={17} />} loading={loading || validating} aria-describedby={!serviceCapabilities.register && step === 4 ? 'register-capability-status' : undefined}>{step === 4 ? serviceCapabilities.register ? 'Qeydiyyatı göndər' : 'Göndərişi yoxla' : 'Davam et'}</Button></footer></div><RegistrationTeamPreview step={step} logoUrl={logoPreview} teamName={draft.teamName} tag={draft.tag} captainName={`${draft.firstName} ${draft.lastName}`.trim()} players={draft.players} tournamentName="AEVIC Competitive Platform" availability={teamAvailability} /></div>
  </div></form></div>;
}

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => { if (!cooldown) return; const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000); return () => window.clearInterval(timer); }, [cooldown]);
  const send = async (event?: FormEvent) => { event?.preventDefault(); if (cooldown || loading) return; setLoading(true); setError(''); try { await services.auth.requestPasswordReset(email); setSent(true); setCooldown(30); } catch { setError('Sorğu göndərilmədi. Şəbəkəni yoxlayıb yenidən cəhd edin.'); } finally { setLoading(false); } };
  return <div className="auth-form-shell"><AuthHeader title="Şifrəni bərpa et" body="Hesab mövcud olarsa, email ünvanına təhlükəsiz bərpa linki göndəriləcək." />{error && <Toast tone="error" title="Sorğu tamamlanmadı" body={error} />}{sent ? <div className="confirmation-state" aria-live="polite"><CheckCircle2 size={34} /><h2>Şifrə bərpa linki göndərildi.</h2><p>Hesab mövcud olarsa link bir neçə dəqiqə ərzində gələcək. Spam qovluğunu da yoxlayın.</p><Button variant="secondary" disabled={cooldown > 0} loading={loading} onClick={() => void send()}>{cooldown ? `Yenidən göndər · ${cooldown}s` : 'Yenidən göndər'}</Button></div> : <form className="auth-form" onSubmit={send}><Input label="E-poçt" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="captain@gmail.com" autoComplete="email" required /><Button type="submit" loading={loading}>Bərpa linkini göndər</Button></form>}<Link className="back-link" to="/login"><ArrowLeft size={16} /> Girişə qayıt</Link></div>;
}
