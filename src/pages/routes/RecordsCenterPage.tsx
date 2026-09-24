import '../../styles/records-archive.css';
import {
ArrowRight
} from "lucide-react";
import { useEffect,useMemo,useState } from "react";
import { Link,useSearchParams } from "react-router-dom";
import {
EmptyState,
LoadingSkeleton,
SectionHeading,
Tabs,
TeamLogo
} from "../../components/common/primitives";
import { serviceCapabilities,services } from "../../services";
import { usePlatformQuery } from "../../services/queryCache";
import "../../styles/public-pages.css";
import type { RecordEntry } from "../../types/domain";
import { recordCategory,recordCategoryLabels,RecordFeatured,RecordInlineDetail,recordValue } from './PublicArchivePagesShared';
import { RecordCard } from './RecordCard';
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
