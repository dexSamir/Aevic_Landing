import { ApiError } from '../../services/apiError';
import { statusLabel } from '../../utils/statusLabels';
import {
History
} from "lucide-react";
import { useEffect,useState } from "react";
import { useParams } from "react-router-dom";
import "../../app/workspaceStyles";
import {
Button,
EmptyState,
LoadingSkeleton,
PageHeader,
SectionHeading
} from "../../components/common/primitives";
import { services } from "../../services";
import { formatDate } from './AdminCompletionPagesShared';
export function AdminPlayerDetailPage() {
  const [loadError, setLoadError] = useState<ApiError | Error>();
  const { playerId = "" } = useParams();
  const [detail, setDetail] =
    useState<Awaited<ReturnType<typeof services.operations.player>>>();
  const [reviewReason, setReviewReason] = useState<Record<string,string>>({});
  const [reviewBusy, setReviewBusy] = useState<string>();
  const [reviewError, setReviewError] = useState('');
  async function review(id:string,status:'APPROVED'|'REJECTED') {
    setReviewBusy(id);setReviewError('');
    try {await services.operations.reviewPlayerClaim(id,status,reviewReason[id]??'');setDetail(await services.operations.player(playerId));}
    catch {setReviewError('Müraciət yenilənmədi. Səbəbi və müraciətin cari vəziyyətini yoxlayın.');}
    finally {setReviewBusy(undefined);}
  }
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active=true;
    setLoaded(false);setLoadError(undefined);setDetail(undefined);
    services.operations.player(playerId)
      .then(value=>{if(active)setDetail(value);})
      .catch(error=>{if(active)setLoadError(error instanceof Error?error:new Error('PLAYER_LOAD_FAILED'));})
      .finally(()=>{if(active)setLoaded(true);});
    return()=>{active=false;};
  }, [playerId]);
  if (loadError)
    return (
      <EmptyState
        heading="h1"
        title={loadError instanceof ApiError&&loadError.status===403?"Giriş icazəsi yoxdur":loadError instanceof ApiError&&loadError.status===401?"Sessiya etibarlı deyil":"Məlumat yüklənmədi"}
        body={loadError instanceof ApiError&&loadError.status===403?"Bu oyunçunun məlumatlarını yalnız səlahiyyətli Admin görə bilər.":loadError instanceof ApiError&&loadError.status===401?"Admin hesabınıza yenidən daxil olun.":"Xidmət hazırda cavab vermir. Dəyişiklik edilməyib."}
        action={
          <Button onClick={() => window.location.reload()}>
            Yenidən yoxla
          </Button>
        }
      />
    );
  if (!loaded) return <LoadingSkeleton variant="player" rows={7} />;
  if (!detail)
    return (
      <>
        <PageHeader
          eyebrow="Oyunçu yoxlaması"
          title="Oyunçu tapılmadı"
          description="Bu identifikatorla oyunçu tapılmadı."
        />
      </>
    );
  return (
    <>
      <PageHeader
        eyebrow="Oyunçu kimliyi"
        title={detail.ign}
        description="Hesab əlaqəsi, komanda üzvlüyü, iştirak uyğunluğu və sahiblik müraciətləri."
      />
      <div className="completion-grid">
        <section>
          <SectionHeading title="Hesab və komanda" />
          <dl className="detail-ledger">
            <div>
              <dt>Bağlı hesab</dt>
              <dd>{detail.linkedAccount?.displayName ?? detail.linkedAccount?.emailHint ?? "Bağlanmayıb"}</dd>
            </div>
            <div>
              <dt>Cari komanda</dt>
              <dd>{detail.currentTeam?.name ?? "Yoxdur"}</dd>
            </div>
            <div>
              <dt>Təsdiq</dt>
              <dd>{statusLabel(detail.verification.status)}</dd>
            </div>
          </dl>
        </section>
        <section>
          <SectionHeading title="İştirak uyğunluğu" />
          <p>
            {detail.eligibilityConflicts.length} açıq uyğunsuzluq ·{" "}
            {detail.sanctions.length} məhdudiyyət
          </p>
        </section>
      </div>
      <section className="admin-player-claims">
        <SectionHeading title="Oyunçu iddiaları" />
        {reviewError && <p role="alert">{reviewError}</p>}
        {!detail.claims?.length && <p>Müraciət yoxdur.</p>}
        {detail.claims?.map(claim=><article key={claim.id} className="history-ledger">
          <strong>{claim.claimantName}</strong><p>{claim.method} · {statusLabel(claim.status)} · {formatDate(claim.createdAt)}</p>
          {claim.reason && <p>{claim.reason}</p>}
          {claim.status==='PENDING' && <>
            <label htmlFor={`reason-${claim.id}`}>Yoxlamanın səbəbi (ən azı 10 simvol)</label>
            <textarea id={`reason-${claim.id}`} minLength={10} maxLength={2000} value={reviewReason[claim.id]??''} onChange={e=>setReviewReason({...reviewReason,[claim.id]:e.target.value})} />
            <Button disabled={!!reviewBusy||(reviewReason[claim.id]?.trim().length??0)<10} onClick={()=>void review(claim.id,'APPROVED')}>Təsdiqlə</Button>
            <Button disabled={!!reviewBusy||(reviewReason[claim.id]?.trim().length??0)<10} variant="danger" onClick={()=>void review(claim.id,'REJECTED')}>Rədd et</Button>
          </>}
        </article>)}
      </section>
      <section>
        <SectionHeading title="Komanda üzvlüyü tarixçəsi" />
        {detail.membershipHistory.length ? (
          <div className="history-ledger">
            {detail.membershipHistory.map((entry) => (
              <article key={entry.id}>
                <History size={18} />
                <strong>{entry.entityName}</strong>
                <span>{entry.role}</span>
                <time>
                  {formatDate(entry.joinedAt)} —{" "}
                  {entry.leftAt ? formatDate(entry.leftAt) : entry.snapshotLabel ? "heyət qeydi" : "davam edir"}
                </time>
                {entry.snapshotLabel && <p>{entry.snapshotLabel}</p>}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Tarixçə yoxdur"
            body="Oyunçunun komanda üzvlüyü tarixçəsi burada görünəcək."
          />
        )}
      </section>
    </>
  );
}
