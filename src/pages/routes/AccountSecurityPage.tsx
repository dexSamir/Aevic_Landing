import { ApiError } from '../../services/apiError';
import { passwordFeedback } from '../../utils/passwordStrength';
import {
KeyRound,
ShieldCheck
} from "lucide-react";
import { type FormEvent,useEffect,useState } from "react";
import "../../app/workspaceStyles";
import {
Button,
Input,
PasswordInput,
PageHeader,
SectionHeading,
Toast
} from "../../components/common/primitives";
import { services } from "../../services";
import type {
TwoFactorRecoveryCodes,
TwoFactorSetup,
TwoFactorStatus
} from "../../types/domain";

export function AccountSecurityPage() {
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState("");
  const [status, setStatus] = useState<TwoFactorStatus>();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [setup, setSetup] = useState<TwoFactorSetup>();
  const [otp, setOtp] = useState("");
  const [recovery, setRecovery] = useState<TwoFactorRecoveryCodes>();
  const [factorPassword,setFactorPassword]=useState("");
  const [factorCode,setFactorCode]=useState("");
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const loadStatus = async () => {
    setStatusLoading(true); setStatusError("");
    try { setStatus(await services.account.twoFactorStatus()); }
    catch (error) { setStatusError(error instanceof ApiError && error.status === 503
      ? "2FA statusu əlçatan deyil. Administrator platforma bazasını, MFA miqrasiyalarını və AEVIC_SESSION_SECRET ayarını yoxlamalıdır."
      : "Təhlükəsizlik statusu yüklənmədi. Bağlantını yoxlayıb yenidən cəhd edin."); }
    finally { setStatusLoading(false); }
  };
  useEffect(() => { void loadStatus(); }, []);
  const strength = passwordFeedback(password);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    if (password !== confirmation || !strength.valid) {
      setNotice(
        "Şifrə tələblərini və şifrə təsdiqini yoxlayın.",
      );
      return;
    }
    setLoading(true);
    try {
      await services.account.changePassword(currentPassword, password);
      setNotice("Şifrə yeniləndi.");
      setCurrentPassword("");
      setPassword("");
      setConfirmation("");
    } catch {
      setNotice("Şifrə yenilənmədi. Cari şifrəni yoxlayın.");
    } finally {
      setLoading(false);
    }
  };
  const beginTwoFactor = async () => {
    if (twoFactorLoading) return;
    if (!factorPassword) { setNotice("2FA qurmaq üçün cari hesab şifrənizi daxil edin."); return; }
    setNotice("");
    setTwoFactorLoading(true);
    try {
      setSetup(await services.account.beginTwoFactorSetup(factorPassword));
    } catch (error) {
      setNotice(error instanceof ApiError && error.code === 'PASSWORD_CHANGE_FAILED'
        ? 'Cari şifrə yanlışdır. Yenidən daxil edin.'
        : error instanceof ApiError && error.code === 'MFA_ALREADY_ENABLED'
          ? '2FA artıq aktivdir. Təhlükəsizlik statusunu yeniləyin.'
          : error instanceof ApiError && error.status === 503
            ? '2FA server xidməti hazır deyil. Administrator AEVIC_DATABASE_URL, AEVIC_SESSION_SECRET və MFA miqrasiyalarını yoxlamalıdır.'
            : error instanceof ApiError && error.status === 429
              ? 'Çox sayda cəhd edildi. Bir az gözləyib yenidən cəhd edin.'
              : 'Aktivləşdirmə başlamadı. Bağlantını yoxlayıb yenidən cəhd edin.');
    } finally {
      setTwoFactorLoading(false);
    }
  };
  const changeFactor = async (disable:boolean) => {
    if(twoFactorLoading||!factorPassword||!factorCode)return;
    setTwoFactorLoading(true);
    try{if(disable){await services.account.disableTwoFactor(factorPassword,factorCode);setRecovery(undefined);}else setRecovery(await services.account.regenerateRecoveryCodes(factorPassword,factorCode));setStatus(await services.account.twoFactorStatus());setFactorPassword("");setFactorCode("");setNotice(disable?"İki mərhələli doğrulama deaktiv edildi.":"Yeni bərpa kodları yaradıldı. Əvvəlki kodlar artıq işləmir.");}
    catch{setNotice("Əməliyyat tamamlanmadı. Şifrəni və yeni doğrulama kodunu yoxlayın.");}finally{setTwoFactorLoading(false);}
  };
  const verifyTwoFactor = async () => {
    if (twoFactorLoading) return;
    if (!setup || !/^\d{6}$/.test(otp)) {
      setNotice("Doğrulama tətbiqindən 6 rəqəmli kod daxil edin.");
      return;
    }
    setTwoFactorLoading(true);
    try {
      setRecovery(
        await services.account.verifyTwoFactorSetup(setup.setupId, otp),
      );
      setStatus(await services.account.twoFactorStatus());
      setSetup(undefined);
      setFactorPassword("");
      setOtp("");
      setNotice("2FA aktiv edildi. Bərpa kodlarını təhlükəsiz saxlayın.");
    } catch {
      setNotice(
        "Birdəfəlik kod təsdiqlənmədi və ya aktivləşdirmə müddəti bitib.",
      );
    } finally {
      setTwoFactorLoading(false);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="Hesab təhlükəsizliyi"
        title="Təhlükəsizlik"
        description="Şifrə dəyişikliyi, TOTP aktivləşdirilməsi və hesabın bərpası."
      />
      {notice && (
        <Toast
          tone={
            notice.includes("yeniləndi.") || notice.includes("aktiv edildi")
              ? "success"
              : "error"
          }
          title="Təhlükəsizlik statusu"
          body={notice}
          onClose={() => setNotice("")}
        />
      )}
      <div className="account-security-grid">
        <form className="account-form" onSubmit={submit}>
          <SectionHeading
            title="Şifrəni dəyiş"
            description="Unudulmuş şifrənin bərpasından fərqli olaraq cari şifrə tələb olunur."
          />
          <PasswordInput
            label="Cari şifrə"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
          <PasswordInput
            label="Yeni şifrə"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
          <PasswordInput
            label="Yeni şifrəni təsdiqlə"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="new-password"
            required
          />
          <div className="password-strength" role="status" aria-live="polite">
            <meter min={0} max={3} value={strength.score} aria-label="Şifrə gücü" />
            <p>{strength.label}</p>
            <ul>{strength.requirements.map(rule => <li key={rule.label}>{rule.met ? '✓' : '○'} {rule.label}</li>)}</ul>
            {confirmation && confirmation !== password && <p role="alert">Şifrələr uyğun gəlmir.</p>}
          </div>
          <Button type="submit" loading={loading} icon={<KeyRound size={17} />}>
            Şifrəni yenilə
          </Button>
        </form>
        <section className="two-factor-panel">
          <ShieldCheck size={26} />
          <span>İki mərhələli doğrulama</span>
          <h2>
            {statusLoading ? "Status yoxlanılır…" : statusError ? "Status yüklənmədi" : status?.enabled
              ? "Aktivdir"
              : status?.setupAvailable
                ? "Aktivləşdirməyə hazırdır"
                : "Server xidməti tələb olunur"}
          </h2>
          <p>
            Məxfi açar və bərpa kodları serverdə yaradılır, birdəfəlik kod orada
            yoxlanılır. Kodlar audit jurnalına daxil edilmir.
          </p>
          {statusError && <div role="alert"><p>{statusError}</p><Button variant="secondary" loading={statusLoading} onClick={() => void loadStatus()}>Statusu yenidən yoxla</Button></div>}
          {!setup&&status?.setupAvailable&&<PasswordInput label="2FA əməliyyatı üçün cari şifrə" hint="Aktivləşdirmək üçün bu sahəyə cari şifrənizi daxil edin. Google ilə yaradılmış hesab üçün əvvəlcə şifrə bərpasından istifadə edin." autoComplete="current-password" value={factorPassword} onChange={event=>setFactorPassword(event.target.value)}/>}
          {setup ? (
            <div className="two-factor-setup">
              <p>Google Authenticator, Microsoft Authenticator və ya uyğun tətbiqdə QR kodunu skan edin, sonra kodu təsdiqləyin.</p>
              <p>Qurulma {new Date(setup.expiresAt).toLocaleTimeString('az-AZ',{hour:'2-digit',minute:'2-digit'})} vaxtınadək etibarlıdır.</p>
              <img
                src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(setup.qrSvg)}`}
                alt="Doğrulama tətbiqi üçün TOTP QR kodu"
              />
              <Input
                label="6 rəqəmli OTP"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                pattern="[0-9]{6}"
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, ""))
                }
              />
              <Button
                loading={twoFactorLoading}
                onClick={() => void verifyTwoFactor()}
              >
                Kodu təsdiqlə
              </Button>
              <Button variant="secondary" disabled={twoFactorLoading} onClick={()=>{setSetup(undefined);setOtp('');}}>Qurulmanı yenidən başlat</Button>
            </div>
          ) : (
            <Button
              loading={twoFactorLoading}
              disabled={statusLoading || !status?.setupAvailable || status?.enabled}
              onClick={() => void beginTwoFactor()}
            >
              {status?.enabled ? "2FA aktivdir" : "2FA-nı aktiv et"}
            </Button>
          )}
          {status?.enabled&&<div className="two-factor-actions"><p>{status.backupCodesRemaining??0} bərpa kodu qalıb.</p><Input label="Doğrulama və ya bərpa kodu" value={factorCode} onChange={event=>setFactorCode(event.target.value.trim())} autoComplete="one-time-code" maxLength={40}/><Button disabled={!factorPassword||!factorCode||twoFactorLoading} onClick={()=>void changeFactor(false)}>Bərpa kodlarını yenilə</Button><Button variant="danger" disabled={!factorPassword||!factorCode||twoFactorLoading} onClick={()=>void changeFactor(true)}>2FA-nı deaktiv et</Button></div>}
          {recovery && (
            <div className="recovery-codes" role="status">
              <strong>Birdəfəlik bərpa kodları</strong>
              <code>{recovery.codes.join("\n")}</code>
              <small>Bu siyahı yalnız bir dəfə göstərilir.</small>
            </div>
          )}
          {status && !status.setupAvailable && (
            <small>
              2FA üçün platforma bazası, MFA miqrasiyaları və ən azı 32 simvolluq AEVIC_SESSION_SECRET konfiqurasiya edilməlidir.
            </small>
          )}
        </section>
      </div>
    </>
  );
}
