import {
KeyRound,
ShieldCheck
} from "lucide-react";
import { type FormEvent,useEffect,useState } from "react";
import "../../app/workspaceStyles";
import {
Button,
Input,
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
  useEffect(() => {
    services.account
      .twoFactorStatus()
      .then(setStatus)
      .catch(() => setNotice("Təhlükəsizlik statusu yüklənmədi."));
  }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirmation || password.length < 8) {
      setNotice(
        "Yeni şifrə minimum 8 simvol olmalı və təsdiqlə uyğun gəlməlidir.",
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
    setTwoFactorLoading(true);
    try {
      setSetup(await services.account.beginTwoFactorSetup(factorPassword));
    } catch {
      setNotice("Aktivləşdirmə başlamadı. Cari şifrəni və bağlantını yoxlayın.");
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
          <Input
            label="Cari şifrə"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
          <Input
            label="Yeni şifrə"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
          <Input
            label="Yeni şifrəni təsdiqlə"
            type="password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="new-password"
            required
          />
          <Button type="submit" loading={loading} icon={<KeyRound size={17} />}>
            Şifrəni yenilə
          </Button>
        </form>
        <section className="two-factor-panel">
          <ShieldCheck size={26} />
          <span>İki mərhələli doğrulama</span>
          <h2>
            {status?.enabled
              ? "Aktivdir"
              : status?.setupAvailable
                ? "Aktivləşdirməyə hazırdır"
                : "Server xidməti tələb olunur"}
          </h2>
          <p>
            Məxfi açar və bərpa kodları serverdə yaradılır, birdəfəlik kod orada
            yoxlanılır. Kodlar audit jurnalına daxil edilmir.
          </p>
          {!setup&&status?.setupAvailable&&<Input label="2FA əməliyyatı üçün cari şifrə" type="password" autoComplete="current-password" value={factorPassword} onChange={event=>setFactorPassword(event.target.value)}/>}
          {setup ? (
            <div className="two-factor-setup">
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
              disabled={!status?.setupAvailable || status?.enabled || !factorPassword}
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
          {!status?.setupAvailable && (
            <small>
              Canlı sistemdə admin hesabları üçün server tərəfindən məcburi
              edilməlidir.
            </small>
          )}
        </section>
      </div>
    </>
  );
}
