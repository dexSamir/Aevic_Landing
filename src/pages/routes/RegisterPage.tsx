import { ArrowLeft,ArrowRight,CheckCircle2,ChevronDown,ShieldCheck } from 'lucide-react';
import { type FormEvent,useEffect,useMemo,useRef,useState } from 'react';
import { Link } from 'react-router-dom';
import { type DraftSaveStatus,PlayerLookupResult,RegistrationSectionTitle,RegistrationStatusPanel,RegistrationStepper,RegistrationTeamPreview,RosterProgress,type SmartReviewCheck,TeamAvailabilityStatus } from '../../components/auth/RegistrationElements';
import { Button,FileUpload,Input,PasswordInput,PhoneInput } from '../../components/common/primitives';
import { serviceCapabilities,services } from '../../services';
import '../../styles/auth.css';
import '../../styles/registration-fields.css';
import type { KnownPlayerLookup,RegistrationPlayerDraft,TeamRegistrationDraft,TeamRegistrationReceipt } from '../../types/domain';
import { duplicatePubgIds,normalizePubgId } from '../../utils/registration';
import { REGISTER_DRAFT_KEY,registrationDraftPayload } from '../../utils/registrationDraft';
import { AuthAvailabilityNotice,AuthHeader,defaultDraft,getStepErrors,PlayerCheck,restoreRegistrationDraft,TeamAvailabilityState } from './AuthPagesShared';
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
  const [logoFile, setLogoFile] = useState<File | null>(null);
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
  const focusField = (id: string) => {
    const field = document.getElementById(id);
    field?.focus({ preventScroll: true });
    if (field && scrollerRef.current) {
      const area = scrollerRef.current;
      const rect = field.getBoundingClientRect();
      const bounds = area.getBoundingClientRect();
      if (rect.top < bounds.top || rect.bottom > bounds.bottom) area.scrollTop += rect.top - bounds.top - 12;
    }
  };
  const goToStep = (nextStep: number) => {
    setStep(nextStep);
    setSubmitError('');
    setUnavailableAttempted(false);
    window.requestAnimationFrame(() => {
      scrollerRef.current?.scrollTo?.({ top: 0, behavior: 'instant' });
      const shell = scrollerRef.current?.closest<HTMLElement>('.register-shell');
      if (shell && shell.getBoundingClientRect().top < 0) window.scrollTo({ top: Math.max(0, window.scrollY + shell.getBoundingClientRect().top - 88), behavior: 'instant' });
    });
  };
  const focusFirstError = (errors: Record<string, string>) => {
    const field = Object.keys(errors)[0];
    const playerIndex = field.match(/^player-(\d+)-/)?.[1];
    if (playerIndex) setOpenPlayer(Number(playerIndex));
    window.setTimeout(() => focusField(field), 0);
  };
  const checkPlayer = async (_index: number) => true;
  const validateRosterPlayers = async () => draft.players.slice(0,4).every(p=>p.ign.trim().length>=2);
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
      { id: 'duplicates', label: duplicates.size ? 'Təkrarlanan PUBG ID aşkarlandı' : 'PUBG ID yoxlaması əlçatan deyil', state: duplicates.size ? 'error' : 'warning', step: 3 },
      { id: 'eligibility', label: crossTeamConflict ? 'Aktiv turnir heyəti ilə ziddiyyət var' : Object.keys(rosterErrors).length ? 'Heyət qaydalarını tamamlayın' : 'Heyət qaydalara uyğundur', state: crossTeamConflict || Object.keys(rosterErrors).length ? 'error' : 'complete', step: 3 },
    ];
  }, [draft, password, confirmation, playerChecks, teamAvailability]);
  const renderPlayerEditor = (player: RegistrationPlayerDraft, index: number) => {
    const optional = index === 4;
    const ignError = errorFor(`player-${index}-ign`);
    const uidError = errorFor(`player-${index}-uid`);
    const complete = Boolean(player.ign.trim().length>=2 && !ignError && !uidError && playerChecks[index]?.state !== 'unavailable');
    const error = ignError || uidError;
    const panelId = `roster-player-${index}-panel`;
    const triggerId = `roster-player-${index}-trigger`;
    return <article className={`roster-player ${openPlayer === index ? 'is-open' : ''} ${complete ? 'is-complete' : ''} ${error ? 'has-error' : ''}`} key={index}>
      <button id={triggerId} type="button" aria-expanded={openPlayer === index} aria-controls={panelId} onClick={() => setOpenPlayer(index)}>
        <span className="player-index">{optional ? 'E1' : `P${index + 1}`}</span>
        <span><strong>{optional ? 'Ehtiyat oyunçu' : index === 0 ? 'Kapitan / oyunçu 1' : `Əsas oyunçu ${index + 1}`}</strong><small>{error || (complete ? player.ign : optional && !player.ign && !player.uid ? 'İstəyə bağlı' : player.ign || 'Məlumatları tamamlayın')}</small></span>
        {complete && <CheckCircle2 size={18} aria-label="Tamamlanıb" />}
        <ChevronDown size={18} aria-hidden="true" />
      </button>
      {openPlayer === index && <div id={panelId} role="region" aria-labelledby={triggerId} className="roster-player__fields">
        <Input id={`player-${index}-ign`} label={optional ? 'Ehtiyat oyunçu adı' : index === 0 ? 'Kapitan / oyunçu adı' : `Oyunçu ${index + 1} adı`} placeholder={optional ? 'SubstituteIGN' : index === 0 ? 'CaptainIGN' : `Starter ${index + 1}`} value={player.ign} onChange={(event) => updatePlayer(index, { ign: event.target.value })} onBlur={() => touch(`player-${index}-ign`)} error={ignError} optional={optional} required={!optional} />
        <Input id={`player-${index}-uid`} disabled hint="PUBG ID saxlanması və uyğunluq yoxlaması hazırda dəstəklənmir." label="PUBG ID" placeholder="51234567890" value={player.uid} onChange={(event) => { updatePlayer(index, { uid: normalizePubgId(event.target.value) }); setPlayerChecks((current) => ({ ...current, [index]: { state: 'idle' } })); setPlayerLookups((current) => ({ ...current, [index]: undefined })); }} onBlur={() => { touch(`player-${index}-uid`); void checkPlayer(index); }} error={uidError} optional={optional} required={!optional} />
        {playerChecks[index]?.state === 'checking' && <p className="player-check-status" role="status">Oyunçu yoxlanılır…</p>}
        {playerLookups[index] && <PlayerLookupResult player={playerLookups[index]!} onUse={() => updatePlayer(index, { ign: playerLookups[index]!.ign })} />}
      </div>}
    </article>;
  };
  const resolveReviewIssue = (check: SmartReviewCheck) => {
    if (!check.step) return;
    goToStep(check.step);
    if (check.fieldId) window.setTimeout(() => focusField(check.fieldId!), 80);
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
          if (!result.available) { setAttemptedSteps((current) => current.includes(1) ? current : [...current, 1]); focusField('teamName'); return; }
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
      focusField('register-terms');
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
      if(logoFile){let bitmap:ImageBitmap|undefined;try{bitmap=await createImageBitmap(logoFile);await services.media.uploadBrandAsset({ownerType:'team',ownerId:result.registrationId,assetType:'logo',fileName:logoFile.name,mimeType:logoFile.type,sizeBytes:logoFile.size,width:bitmap.width,height:bitmap.height},logoFile);}catch{setSubmitError('Komanda yaradıldı, lakin loqo yüklənmədi. Paneldən yenidən yükləyin.');}finally{bitmap?.close();}}
    } catch {
      setSubmitError('Qeydiyyatı göndərmək mümkün olmadı. Məlumatlarınız qorunub — yenidən cəhd edin.');
    } finally {
      setLoading(false);
    }
  };

  if (receipt) return <div className="auth-form-shell auth-success"><CheckCircle2 size={42} /><span>Qeydiyyat sorğusu qəbul edildi</span><h1>Komandanız yoxlamaya göndərildi.</h1><RegistrationStatusPanel status={receipt.status} nextStep="Komanda məlumatlarını paneldə idarə edə bilərsiniz. Qeydiyyat administrator yoxlamasını gözləyir." /><p>Şifrə brauzer yaddaşında saxlanılmadı.</p>{submitError&&<p role="alert">{submitError}</p>}<div><Link className="button button--primary" to="/team"><span>Komanda panelini aç</span></Link><Link className="button button--ghost" to="/"><span>Ana səhifə</span></Link></div></div>;
  return <div className="register-shell" data-step={step}><AuthHeader identity title="Komandanı yarışa hazırla" body="Dörd qısa addım. Məlumatlar əlavə edildikdən sonra dərhal yoxlama mərhələsinə keçəcəksiniz." /><RegistrationStepper currentStep={step} saveStatus={saveStatus} /><Button variant="ghost" type="button" disabled={loading} onClick={() => { window.sessionStorage.removeItem(REGISTER_DRAFT_KEY); setDraft(defaultDraft); setPassword(''); setConfirmation(''); setStep(1); setTouched({}); setAttemptedSteps([]); setAccepted(false); setSubmitError(''); setSaveStatus('idle'); setLogoPreview(''); setUnavailableAttempted(false); }}>Qaralamanı sil</Button><form className="auth-form register-form" noValidate onSubmit={submit}><div className="auth-capability-fields"><div className="register-workspace"><div className="register-workspace__form"><div className="register-workspace__scroller" ref={scrollerRef}>
    {step === 1 && <section><RegistrationSectionTitle step={1} title="Komanda kimliyi" body="Turnirlərdə və liderlik cədvəlində görünəcək əsas məlumatlar." /><div className="team-step-fields"><FileUpload label="Komanda loqosunu seç" hint="PNG, JPG və ya WebP · maksimum 4 MB" preview="none" accept={['image/png','image/jpeg','image/webp']} maxBytes={4_000_000} onFile={file=>{setLogoFile(file);setLogoPreview(URL.createObjectURL(file));}} /><div className="team-identity-fields"><Input id="teamName" label="Komanda adı" placeholder="Nexus Esports" value={draft.teamName} onChange={(event) => updateDraft('teamName', event.target.value)} onBlur={() => touch('teamName')} error={errorFor('teamName') || (teamAvailability === 'unavailable' ? 'Bu komanda adı artıq istifadə olunur.' : undefined)} required /><Input id="tag" disabled hint="Teq saxlanması hazırda dəstəklənmir." label="Qısa tag" placeholder="NXS" value={draft.tag} onChange={(event) => updateDraft('tag', event.target.value.toUpperCase())} maxLength={5} optional /></div><div className="team-availability-slot"><TeamAvailabilityStatus state={teamAvailability} /></div></div></section>}
    {step === 2 && <section><RegistrationSectionTitle step={2} title="Kapitan məlumatları" body="Təsdiq və oyun günü əlaqəsi üçün məsul şəxs." /><div className="form-grid"><Input id="firstName" label="Ad" placeholder="Murad" value={draft.firstName} onChange={(event) => updateDraft('firstName', event.target.value)} onBlur={() => touch('firstName')} error={errorFor('firstName')} autoComplete="given-name" required /><Input id="lastName" label="Soyad" placeholder="Məmmədov" value={draft.lastName} onChange={(event) => updateDraft('lastName', event.target.value)} onBlur={() => touch('lastName')} error={errorFor('lastName')} autoComplete="family-name" required /></div><div className="form-grid"><PhoneInput id="phone" label="WhatsApp nömrəsi" value={draft.phone} onValueChange={(value) => updateDraft('phone', value)} onBlur={() => touch('phone')} error={errorFor('phone')} required /><Input id="email" label="E-poçt" type="email" placeholder="captain@gmail.com" value={draft.email} onChange={(event) => updateDraft('email', event.target.value)} onBlur={() => touch('email')} error={errorFor('email')} autoComplete="email" required /></div><div className="form-grid password-grid"><div><PasswordInput id="password" label="Şifrə" value={password} onChange={(event) => setPassword(event.target.value)} onBlur={() => touch('password')} error={errorFor('password')} autoComplete="new-password" required /><ul className="password-requirements" aria-label="Şifrə tələbləri">{passwordRequirements.map((requirement) => <li className={requirement.met ? 'met' : ''} key={requirement.label}><CheckCircle2 size={15} aria-hidden="true" />{requirement.label}</li>)}</ul></div><PasswordInput id="confirmation" label="Şifrəni təsdiqlə" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} onBlur={() => touch('confirmation')} error={confirmation ? errorFor('confirmation') : attemptedSteps.includes(2) ? stepErrors.confirmation : undefined} success={confirmation && confirmation === password ? 'Şifrələr uyğun gəlir.' : undefined} autoComplete="new-password" required /></div></section>}
    {step === 3 && <section><RegistrationSectionTitle step={3} title="4 əsas oyunçu + 1 ehtiyat" body="Əsas heyəti tamamlayın. Ehtiyat oyunçu istəyə bağlıdır." /><RosterProgress players={draft.players} /><div className="roster-players" aria-label="Heyət oyunçuları">{draft.players.map(renderPlayerEditor)}</div></section>}
    {step === 4 && <section className="registration-review">
      <RegistrationSectionTitle step={4} title="Yekun icmal" body="Qeydiyyatı göndərməzdən əvvəl məlumatları son dəfə yoxlayın." />
      <div className="review-readiness" role="status"><ShieldCheck size={17} /><span>{smartChecks.some(check => check.state === 'error') ? 'Məlumatları tamamlayın' : '3/3 əsas bölmə tamamlandı'}</span></div>
      {smartChecks.some(check => check.state === 'error') && <ul className="review-issues">{smartChecks.filter(check => check.state === 'error').map(check => <li key={check.id}><span>{check.label}</span><button type="button" onClick={() => resolveReviewIssue(check)}>Düzəliş et</button></li>)}</ul>}
      <div className="registration-review-groups">
        <section className="registration-review-group"><header><h3>Komanda</h3><button type="button" onClick={() => goToStep(1)}>Düzəliş et</button></header><div className="review-team-identity">{logoPreview ? <img src={logoPreview} alt="Komanda loqosu" /> : <span>{draft.tag || 'KO'}</span>}<div><strong>{draft.teamName || 'Komanda adı yoxdur'}</strong><small>{draft.tag || 'Tag əlavə edilməyib'}</small></div></div></section>
        <section className="registration-review-group"><header><h3>Kapitan</h3><button type="button" onClick={() => goToStep(2)}>Düzəliş et</button></header><strong>{`${draft.firstName} ${draft.lastName}`.trim() || 'Kapitan adı yoxdur'}</strong><p>{draft.email || 'E-poçt əlavə edilməyib'}</p><p>{draft.phone || 'WhatsApp əlavə edilməyib'}</p></section>
        <section className="registration-review-group review-roster"><header><h3>Heyət</h3><button type="button" onClick={() => goToStep(3)}>Düzəliş et</button></header><ol>{draft.players.map((player,index) => <li key={index}><span>{String(index+1).padStart(2,'0')}</span><strong>{player.ign || 'Əlavə edilməyib'}</strong><small>{index === 4 ? 'Ehtiyat' : index === 0 ? 'Kapitan' : 'Əsas heyət'}</small></li>)}</ol></section>
        <section className="registration-review-group review-regulations"><header><h3>Qaydalar</h3></header><div className="registration-agreement"><input id="register-terms" type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} /><div><label htmlFor="register-terms">Məlumatların düzgün olduğunu və turnir qaydalarını qəbul edirəm.</label><Link to="/regulations">Turnir qaydalarını oxu <ArrowRight size={14} /></Link></div></div><p>Təsdiq turnir slotu deyil. Komanda təsdiqləndikdən sonra ayrıca açıq turnirə qoşulmalıdır.</p></section>
      </div>
    </section>}
    {submitError && <p className="register-submit-error" role="alert">{submitError}</p>}
    </div>{!serviceCapabilities.register && step === 4 && <AuthAvailabilityNotice registration attempted={unavailableAttempted} />}<footer className="register-actions">{step > 1 ? <Button type="button" variant="ghost" icon={<ArrowLeft size={17} />} onClick={() => goToStep(step - 1)} disabled={loading || validating}>Geri</Button> : <span />}<Button type="submit" icon={<ArrowRight size={17} />} loading={loading || validating} aria-describedby={!serviceCapabilities.register && step === 4 ? 'register-capability-status' : undefined}>{step === 4 ? serviceCapabilities.register ? 'Qeydiyyatı göndər' : 'Göndərişi yoxla' : 'Davam et'}</Button></footer></div><RegistrationTeamPreview step={step} logoUrl={logoPreview} teamName={draft.teamName} tag={draft.tag} captainName={`${draft.firstName} ${draft.lastName}`.trim()} players={draft.players} tournamentName="AEVIC Competitive Platform" availability={teamAvailability} ready={!smartChecks.some(check => check.state === 'error')} /></div>
  </div></form><p className="auth-switch register-login">Artıq hesabınız var? <Link to="/login">Daxil olun <ArrowRight size={17} /></Link></p></div>;
}
