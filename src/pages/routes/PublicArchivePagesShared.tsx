import {
ArrowRight,
Share2
} from "lucide-react";
import { useEffect,useState } from "react";
import { Link } from "react-router-dom";
import {
Button,
TeamLogo,
Toast
} from "../../components/common/primitives";
import { services } from "../../services";
import { usePlatformQuery } from "../../services/queryCache";
import "../../styles/public-pages.css";
import type { RecordEntry,TournamentRecapData } from "../../types/domain";

export function recordValue(record: RecordEntry) {
  return `${record.value} ${record.unit}`;
}
export function recordCategory(record: RecordEntry) {
  if (
    record.type === "MOST_KILLS_ONE_MATCH" ||
    record.type === "BEST_SINGLE_MATCH_POINTS"
  )
    return "match";
  if (
    record.type === "MOST_WWCD_ONE_TOURNAMENT" ||
    record.type === "HIGHEST_TOURNAMENT_POINTS" ||
    record.type === "MOST_KILLS_ONE_TOURNAMENT"
  )
    return "tournament";
  return "team";
}
export const recordCategoryLabels: Record<string, string> = {
  match: "Matç rekordları",
  tournament: "Turnir rekordları",
  team: "Komanda rekordları",
};
export function RecordFeatured({ record }: { record: RecordEntry }) {
  return (
    <section
      className="record-featured"
      aria-labelledby="featured-record-title"
    >
      <div className="record-featured__number">
        <span>REKORD 001</span>
        <strong>{record.value}</strong>
        <small>{record.unit}</small>
      </div>
      <div className="record-featured__story">
        <span>ARXİVİN SEÇİMİ</span>
        <h2 id="featured-record-title">{record.label}</h2>
        <div>
          <TeamLogo name={record.teamName} src={record.teamLogo} size="lg" />
          <span>
            <strong>{record.teamName}</strong>
            <small>{record.tournamentName}</small>
          </span>
        </div>
        <dl>
          {record.map && (
            <div>
              <dt>Xəritə</dt>
              <dd>{record.map}</dd>
            </div>
          )}
          {record.roundLabel && (
            <div>
              <dt>Raund</dt>
              <dd>{record.roundLabel}</dd>
            </div>
          )}
          <div>
            <dt>Tarix</dt>
            <dd>
              {new Date(record.achievedAt).toLocaleDateString("az-AZ", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </dd>
          </div>
        </dl>
        <Link to={`/records?record=${record.id}#record-detail`}>
          Mənbəni aç <ArrowRight size={17} />
        </Link>
      </div>
    </section>
  );
}
export function RecordInlineDetail({ record }: { record: RecordEntry }) {
  const { data: history = [] } = usePlatformQuery({
    key: `record-history:${record.id}`,
    scope: "public",
    query: () => services.records.history(record.id),
  });
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const detail = document.getElementById("record-detail");
      detail?.scrollIntoView({ block: "start" });
      detail?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [record.id]);
  return (
    <section
      id="record-detail"
      className="record-inline-detail"
      aria-labelledby="record-inline-title"
      tabIndex={-1}
    >
      <header>
        <div>
          <span>RƏSMİ REKORD</span>
          <h2 id="record-inline-title">{record.label}</h2>
          <p>
            {record.teamName} · {record.tournamentName}
          </p>
        </div>
        <strong>{recordValue(record)}</strong>
        <Link aria-label="Rekord detalını bağla" to="/records">
          Bağla
        </Link>
      </header>
      <div className="record-inline-detail__body">
        <dl>
          <div>
            <dt>Turnir</dt>
            <dd>{record.tournamentName}</dd>
          </div>
          <div>
            <dt>Xəritə</dt>
            <dd>{record.map ?? "—"}</dd>
          </div>
          <div>
            <dt>Raund</dt>
            <dd>{record.roundLabel ?? "—"}</dd>
          </div>
          <div>
            <dt>Tarix</dt>
            <dd>
              {new Date(record.achievedAt).toLocaleDateString("az-AZ", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </dd>
          </div>
        </dl>
        <div className="record-inline-detail__roster">
          <h3>Tarixi heyət</h3>
          {record.rosterSnapshotStatus === "available" ? (
            <div>
              {record.rosterSnapshot.map((player) => (
                <span key={player.playerId}>
                  <strong>{player.ign}</strong>
                  <small>{player.role}</small>
                </span>
              ))}
            </div>
          ) : (
            <p>
              Cari heyət tarixi mənbə kimi əvəz edilmir; snapshot dərc
              edilməyib.
            </p>
          )}
        </div>
      </div>
      {history.length > 0 && (
        <footer>
          <span>Rekordun inkişafı</span>
          {history.map((entry) => (
            <Link
              key={entry.id}
              to={`/records?record=${entry.id}#record-detail`}
            >
              {entry.teamName}
              <strong>{recordValue(entry)}</strong>
            </Link>
          ))}
        </footer>
      )}
    </section>
  );
}
export function ShareRecap({ recap }: { recap: TournamentRecapData }) {
  const [shared, setShared] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const share = async () => {
    if (busy) return;
    setBusy(true);
    setShared(false);
    setFailed(false);
    try {
      const payload = {
        title: `${recap.tournament.name} · Turnir yekunu`,
        text: `${recap.totalMatches} dərc edilmiş matç · ${recap.totalKills} kill`,
        url: window.location.href,
      };
      if (navigator.share) await navigator.share(payload);
      else await navigator.clipboard.writeText(window.location.href);
      setShared(true);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      {shared && (
        <Toast
          title="Yekun keçidi hazırdır"
          body="Keçid paylaşma panelinə göndərildi və ya panoya kopyalandı."
          onClose={() => setShared(false)}
        />
      )}
      {failed && (
        <Toast
          tone="error"
          title="Paylaşma tamamlanmadı"
          body="Keçidi ünvan sətrindən kopyalaya və ya yenidən cəhd edə bilərsiniz."
          onClose={() => setFailed(false)}
        />
      )}
      <Button
        variant="secondary"
        loading={busy}
        icon={<Share2 size={17} />}
        onClick={() => void share()}
      >
        Yekunu paylaş
      </Button>
    </>
  );
}
