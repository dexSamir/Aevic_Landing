import "../styles/public-pages.css";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Crown,
  History,
  Medal,
  Share2,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import {
  Button,
  EmptyState,
  LoadingSkeleton,
  SectionHeading,
  Tabs,
  TeamLogo,
  Toast,
} from "../components/common/primitives";
import { serviceCapabilities, services } from "../services";
import { usePlatformQuery } from "../services/queryCache";
import type { RecordEntry, TournamentRecapData } from "../types/domain";

function recordValue(record: RecordEntry) {
  return `${record.value} ${record.unit}`;
}
function recordCategory(record: RecordEntry) {
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
const recordCategoryLabels: Record<string, string> = {
  match: "Matç rekordları",
  tournament: "Turnir rekordları",
  team: "Komanda rekordları",
};

export function RecordCard({
  record,
  index = 0,
}: {
  record: RecordEntry;
  index?: number;
}) {
  return (
    <Link
      className="record-card"
      to={`/records?record=${record.id}#record-detail`}
    >
      <b className="record-card__index">{String(index + 1).padStart(2, "0")}</b>
      <div className="record-card__title">
        <span>{recordCategoryLabels[recordCategory(record)]}</span>
        <strong>{record.label}</strong>
      </div>
      <strong className="record-card__value">{recordValue(record)}</strong>
      <div className="record-card__team">
        <TeamLogo name={record.teamName} src={record.teamLogo} size="sm" />
        <span>
          <b>{record.teamName}</b>
          <small>{record.tournamentName}</small>
        </span>
      </div>
      <time dateTime={record.achievedAt}>
        {new Date(record.achievedAt).toLocaleDateString("az-AZ", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </time>
      <ArrowRight size={18} />
    </Link>
  );
}

function RecordFeatured({ record }: { record: RecordEntry }) {
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

function RecordInlineDetail({ record }: { record: RecordEntry }) {
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

export function RecordsCenterPage() {
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(
    serviceCapabilities.publicRecords,
  );
  const [failed, setFailed] = useState(false);
  const [category, setCategory] = useState("all");
  const [searchParams] = useSearchParams();
  const selectedId = searchParams.get("record");
  const selectedQuery = usePlatformQuery({
    key: `record:${selectedId}`,
    scope: "public",
    enabled: Boolean(
      selectedId &&
      serviceCapabilities.publicRecords &&
      !records.some((r) => r.id === selectedId),
    ),
    query: () => services.records.get(selectedId!),
  });
  const recordsQuery = usePlatformQuery({
    key: "records",
    scope: "public",
    query: () => services.records.list(),
    enabled: serviceCapabilities.publicRecords,
  });
  useEffect(() => {
    setRecords(recordsQuery.data ?? []);
    setFailed(Boolean(recordsQuery.error));
    setLoading(recordsQuery.loading);
  }, [recordsQuery.data, recordsQuery.error, recordsQuery.loading]);
  const categories = useMemo(
    () => [...new Set(records.map(recordCategory))],
    [records],
  );
  const visible =
    category === "all"
      ? records
      : records.filter((record) => recordCategory(record) === category);
  const selectedRecord =
    records.find((record) => record.id === selectedId) ?? selectedQuery.data;
  if (!serviceCapabilities.publicRecords)
    return (
      <section className="records-center page-section">
        <div className="container">
          <header className="records-center__masthead">
            <span>AEVIC REKORD ARXİVİ</span>
            <h1>Rekordlar tarixə necə düşür.</h1>
            <p>
              Dərc edilmiş nəticə, nailiyyət tarixi və tarixi heyət mənbəyi ilə
              daimi yarış arxivi.
            </p>
          </header>
          <EmptyState
            title="Hər rekordun arxasında nəticə var"
            body="Hazırda ictimai rekord yoxdur. Rekord üçün dərc edilmiş nəticə, tarix və turnir mənbəyi tələb olunur; bu arada xal qaydalarını öyrənin."
            action={
              <Link className="button button--secondary" to="/regulations">
                <span>Nəticə qaydalarını öyrən</span>
                <ArrowRight size={17} />
              </Link>
            }
          />
        </div>
      </section>
    );
  return (
    <section className="records-center page-section">
      <div className="container">
        <header className="records-center__masthead">
          <span>AEVIC REKORD ARXİVİ</span>
          <h1>Rekordlar tarixə necə düşür.</h1>
          <p>
            Dərc edilmiş nəticə, nailiyyət tarixi və tarixi heyət mənbəyi ilə
            daimi yarış arxivi.
          </p>
        </header>
        {loading && (
          <div className="record-skeletons">
            <LoadingSkeleton variant="cards" rows={4} />
            <LoadingSkeleton variant="cards" rows={4} />
          </div>
        )}
        {!loading && failed && (
          <EmptyState
            title="Rekordlar əlçatan deyil"
            body="Rekord servisi cavab vermir. Bir az sonra yenidən cəhd edin."
          />
        )}
        {!loading && !failed && !records.length && (
          <EmptyState
            title="İlk rekord üçün rəsmi nəticə lazımdır"
            body="Təsdiqlənmiş rekordlar mənbəyi ilə burada görünəcək. Xalın necə hesablandığı ilə indidən tanış olun."
            action={
              <Link className="text-link" to="/regulations#rule-5">
                Xal qaydalarına bax
              </Link>
            }
          />
        )}
        {!loading && !failed && records.length > 0 && (
          <>
            <div className="records-board">
              <aside className="records-board__index">
                <span>ARXİV REYESTRİ</span>
                <strong>{String(records.length).padStart(2, "0")}</strong>
                <Tabs
                  active={category}
                  onChange={setCategory}
                  items={[
                    { id: "all", label: "Hamısı", count: records.length },
                    ...categories.map((recordCategoryId) => ({
                      id: recordCategoryId,
                      label: recordCategoryLabels[recordCategoryId],
                      count: records.filter(
                        (record) => recordCategory(record) === recordCategoryId,
                      ).length,
                    })),
                  ]}
                />
              </aside>
              <div className="records-board__canvas">
                <div className="records-board__features">
                  <RecordFeatured record={records[0]} />
                  {records.length > 1 && (
                    <aside className="records-board__highlights">
                      {records.slice(1, 3).map((record) => (
                        <Link
                          key={record.id}
                          to={`/records?record=${record.id}#record-detail`}
                        >
                          <span>
                            {recordCategoryLabels[recordCategory(record)]}
                          </span>
                          <strong>{recordValue(record)}</strong>
                          <h2>{record.label}</h2>
                          <div>
                            <TeamLogo
                              name={record.teamName}
                              src={record.teamLogo}
                              size="sm"
                            />
                            <span>{record.teamName}</span>
                            <ArrowRight size={17} aria-hidden="true" />
                          </div>
                        </Link>
                      ))}
                    </aside>
                  )}
                </div>
                {selectedId && selectedQuery.loading && !selectedRecord && (
                  <LoadingSkeleton variant="cards" rows={3} />
                )}
                {selectedId && !selectedQuery.loading && !selectedRecord && (
                  <EmptyState
                    title={
                      selectedQuery.error
                        ? "Rekord yüklənmədi"
                        : "Rekord tapılmadı"
                    }
                    body={
                      selectedQuery.error
                        ? "Bağlantını yoxlayıb yenidən cəhd edin."
                        : "Seçilmiş rekord arxivdə yoxdur."
                    }
                    action={
                      <Link className="button button--secondary" to="/records">
                        <span>Arxivə qayıt</span>
                      </Link>
                    }
                  />
                )}
                {selectedRecord && (
                  <RecordInlineDetail record={selectedRecord} />
                )}
                <section className="record-categories">
                  <SectionHeading
                    title="Arxiv reyestri"
                    description="Yalnız mövcud nəticə mənbəyinin sübut etdiyi kateqoriyalar"
                  />
                  <div className="record-grid record-ledger">
                    {visible.map((record, index) => (
                      <RecordCard
                        key={record.id}
                        record={record}
                        index={index}
                      />
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export function RecordDetailPage() {
  const { recordId = "" } = useParams();
  return (
    <Navigate
      to={`/records?record=${encodeURIComponent(recordId)}#record-detail`}
      replace
    />
  );
}

function ShareRecap({ recap }: { recap: TournamentRecapData }) {
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

export function TournamentRecapPage() {
  const { tournamentId = "" } = useParams();
  const [recap, setRecap] = useState<TournamentRecapData>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    setRecap(undefined);
    services.tournaments
      .recap(tournamentId)
      .then((value) => {
        if (active) setRecap(value);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tournamentId]);
  if (loading)
    return (
      <section className="page-section">
        <div className="container">
          <LoadingSkeleton variant="cards" rows={7} />
        </div>
      </section>
    );
  if (failed)
    return (
      <section className="page-section">
        <div className="container">
          <EmptyState
            heading="h1"
            title="Turnir yekunu yüklənmədi"
            body="İctimai yekun servisi hazırda əlçatan deyil."
          />
        </div>
      </section>
    );
  if (!recap)
    return (
      <section className="page-section">
        <div className="container">
          <EmptyState
            heading="h1"
            title="Final yekunu hələ yoxdur"
            body="Turnir yekunu yalnız yarış tamamlanıb rəsmi nəticələr dərc edildikdən sonra görünür."
            action={
              <Link
                className="button button--secondary"
                to={`/tournaments/${tournamentId}`}
              >
                <span>Turnirə qayıt</span>
              </Link>
            }
          />
        </div>
      </section>
    );
  return (
    <article className="tournament-recap">
      <header className="recap-hero">
        <div className="container">
          <div>
            <span>
              {recap.coverage === "partial"
                ? "Qismən dərc edilmiş nəticələr"
                : "Rəsmi final yekunu"}
            </span>
            <h1>{recap.tournament.name}</h1>
            <p>
              Deterministik turnir yekunu · süni intellektlə uydurulmuş mətn
              istifadə edilmir.
            </p>
            <div className="recap-actions">
              <Link
                className="button button--primary"
                to={`/tournaments/${recap.tournament.id}`}
              >
                Turnir detalı <ArrowRight size={17} />
              </Link>
              <ShareRecap recap={recap} />
            </div>
          </div>
          {recap.champion ? (
            <Link
              className="recap-champion"
              to={`/teams/${recap.champion.slug}`}
            >
              <Crown size={28} />
              <span>Çempion</span>
              <TeamLogo
                name={recap.champion.name}
                src={recap.champion.logoUrl}
                size="lg"
              />
              <strong>{recap.champion.name}</strong>
            </Link>
          ) : (
            <div className="recap-champion recap-champion--pending">
              <Trophy size={28} />
              <span>Çempion</span>
              <strong>Dərc edilməyib</strong>
              <small>Final sıralama üçün server snapshot-ı tələb olunur.</small>
            </div>
          )}
        </div>
      </header>
      <div className="container recap-body">
        <section
          className="recap-highlights"
          aria-label="Turnir yekun göstəriciləri"
        >
          <article>
            <Swords size={19} />
            <strong>{recap.totalMatches || "—"}</strong>
            <span>
              {recap.coverage === "partial"
                ? "Məlumatdakı raund"
                : "Ümumi matç"}
            </span>
          </article>
          <article>
            <Medal size={19} />
            <strong>{recap.totalKills || "—"}</strong>
            <span>
              {recap.coverage === "partial" ? "Məlumatdakı kill" : "Ümumi kill"}
            </span>
          </article>
          <article>
            <Crown size={19} />
            <strong>{recap.totalWwcd || "—"}</strong>
            <span>
              {recap.coverage === "partial" ? "Məlumatdakı WWCD" : "WWCD"}
            </span>
          </article>
          <article>
            <CalendarDays size={19} />
            <strong>{recap.tournament.days}</strong>
            <span>Yarış günü</span>
          </article>
        </section>
        <section className="recap-standings">
          <SectionHeading
            title="Final sıralama"
            description="Yalnız rəsmi liderlik snapshot-ı olduqda göstərilir"
          />
          {recap.standings.length ? (
            <ol>
              {recap.standings.map((standing) => (
                <li key={standing.teamId}>
                  <b>#{standing.rank}</b>
                  <strong>{standing.teamName}</strong>
                  <span>
                    {standing.wwcd} WWCD · {standing.finishes} kill
                  </span>
                  <em>{standing.points} xal</em>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              title="Final sıralama dərc edilməyib"
              body="Arxivdə tamamlanmış turnir üçün etibarlı liderlik snapshot-ı yoxdur."
            />
          )}
        </section>
        <section className="recap-archive-note">
          <History size={20} />
          <div>
            <strong>Arxiv bütövlüyü</strong>
            <p>
              MVP, ən yaxşı oyunçu və subyektiv mükafatlar rəsmi hesablama
              olmadan göstərilmir. Mövcud yekun yalnız dərc edilmiş matç
              cəmlərindən istifadə edir.
            </p>
          </div>
        </section>
      </div>
    </article>
  );
}
