import {
Database,
Trash2
} from "lucide-react";
import { type FormEvent,useEffect,useState } from "react";
import "../../app/workspaceStyles";
import {
Button,
ConfirmDialog,
EmptyState,
Input,
LoadingSkeleton,
PageHeader,
PhoneInput,
SectionHeading,
Toast
} from "../../components/common/primitives";
import { services } from "../../services";
import type {
AccountExportJob
} from "../../types/domain";
import { useAccountProfile } from './AccountPagesShared';
export function AccountProfilePage() {
  const { profile, setProfile, failed } = useAccountProfile();
  const [saved, setSaved] = useState(false);
  const [deletionOpen, setDeletionOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [exportJob, setExportJob] = useState<AccountExportJob>();
  const [exporting, setExporting] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  useEffect(() => {
    if (profile) {
      setFirstName(profile.user.firstName);
      setLastName(profile.user.lastName);
      setPhone(profile.user.phone ?? "");
    }
  }, [profile]);
  if (failed)
    return (
      <EmptyState
        title="Hesab yüklənmədi"
        body="Hesab servisi cavab vermir. Bir az sonra yenidən cəhd edin."
      />
    );
  if (!profile) return <LoadingSkeleton variant="form" rows={6} />;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const next = await services.account.updateProfile({
        firstName,
        lastName,
        phone,
      });
      setProfile(next);
      setSaved(true);
    } catch {
      setNotice("Hesab saxlanılmadı. Dəyişiklikləriniz formadadır.");
    }
  };
  const requestDeletion = async () => {
    try {
      const result = await services.account.requestDeletion();
      setDeletionOpen(false);
      setNotice(
        result.blocked
          ? (result.reason ?? "Hesab silinə bilmir.")
          : "Hesab deaktivasiya sorğusu yoxlamaya göndərildi.",
      );
    } catch {
      setNotice("Sorğu saxlanılmadı. Yenidən cəhd edin.");
    }
  };
  const requestExport = async () => {
    setExporting(true);
    try {
      const job = await services.account.requestDataExport();
      setExportJob(job);
      setNotice(
        "Yükləmə sorğusu yaradıldı. Hazır olduqda təhlükəsiz keçid görünəcək.",
      );
    } catch {
      setNotice("Məlumatlar hazırlanmadı. Yenidən cəhd edin.");
    } finally {
      setExporting(false);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="Hesab profili"
        title="Şəxsi məlumatlar"
        description="Hesab məlumatları komandanın ictimai kimliyi və yarış nəticələrindən ayrıdır."
      />
      {saved && (
        <Toast
          title="Hesab məlumatları saxlanıldı"
          onClose={() => setSaved(false)}
        />
      )}
      {notice && (
        <Toast
          tone="info"
          title="Hesab əməliyyatı"
          body={notice}
          onClose={() => setNotice("")}
        />
      )}
      <form className="account-form" onSubmit={submit}>
        <section>
          <SectionHeading title="Profil" />
          <div className="form-grid">
            <Input
              label="Ad"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              autoComplete="given-name"
              required
            />
            <Input
              label="Soyad"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              autoComplete="family-name"
              required
            />
          </div>
          <Input
            label="E-poçt"
            type="email"
            value={profile.user.email}
            disabled
            hint={
              profile.emailVerified
                ? "E-poçt təsdiqlənib"
                : "E-poçt təsdiqi tələb olunur"
            }
          />
          <PhoneInput
            label="Telefon"
            value={phone}
            onValueChange={setPhone}
            autoComplete="tel"
          />
          <Button type="submit">Dəyişiklikləri saxla</Button>
        </section>
        <section className="account-boundary">
          <SectionHeading title="Məxfilik və hesab" />
          <div>
            <Database size={20} />
            <span>
              <strong>Məlumatlarımı yüklə</strong>
              <small>
                {exportJob
                  ? `Export ${exportJob.status.toLocaleLowerCase("az")}`
                  : "Hesabınıza aid məlumatların surətini yükləyin."}
              </small>
            </span>
            {exportJob?.status === "READY" && exportJob.downloadUrl ? (
              <a
                className="button button--secondary"
                href={exportJob.downloadUrl}
              >
                <span>Yüklə</span>
              </a>
            ) : (
              <Button
                variant="secondary"
                loading={exporting}
                disabled={profile.dataExportStatus === "backend-required"}
                onClick={() => void requestExport()}
              >
                Yükləmə tələb et
              </Button>
            )}
          </div>
          <div>
            <Trash2 size={20} />
            <span>
              <strong>Hesabı deaktiv et</strong>
              <small>Komanda sahibsiz qala bilməz.</small>
            </span>
            <Button variant="danger" onClick={() => setDeletionOpen(true)}>
              Deaktiv et
            </Button>
          </div>
        </section>
      </form>
      <ConfirmDialog
        open={deletionOpen}
        title="Hesabı deaktiv etmək istəyirsiniz?"
        body="Komanda sahibisinizsə, əvvəlcə sahibliyi ötürməlisiniz. Bu əməliyyat server təsdiqi olmadan icra edilmir."
        confirmLabel="Yoxla və davam et"
        onClose={() => setDeletionOpen(false)}
        onConfirm={requestDeletion}
      />
    </>
  );
}
