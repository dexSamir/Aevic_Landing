import {
ArrowRight
} from "lucide-react";
import { useEffect,useMemo,useState } from "react";
import { Link,useSearchParams } from "react-router-dom";
import '../../styles/public-discovery.css';
import {
Button,
EmptyState,
Input,
LoadingSkeleton,
PageHeader
} from "../../components/common/primitives";
import { services } from "../../services";
import { safeInternalPath } from "../../utils/routes";

export function SearchResultsPage() {
  const [loadError, setLoadError] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [result, setResult] =
    useState<Awaited<ReturnType<typeof services.search.public>>>();
  useEffect(() => {
    let active = true;
    setLoadError(false);
    setResult(undefined);
    services.search
      .public(query)
      .then((value) => {
        if (active) setResult(value);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [query]);
  const items = useMemo(
    () =>
      result
        ? Object.entries(result.groups)
            .filter(([group]) => group !== "player")
            .flatMap(([, group]) => group ?? [])
            .map((item) => ({ ...item, href: safeInternalPath(item.href) }))
            .filter((item): item is typeof item & { href: string } =>
              Boolean(item.href),
            )
        : [],
    [result],
  );
  if (loadError)
    return (
      <EmptyState
        heading="h1"
        title="Məlumat yüklənmədi"
        body="Xidmət hazırda cavab vermir. Dəyişiklik edilməyib."
        action={
          <Button onClick={() => window.location.reload()}>
            Yenidən yoxla
          </Button>
        }
      />
    );
  return (
    <section className="page-section completion-page">
      <div className="container">
        <PageHeader
          eyebrow="Platformada axtarış"
          title="Axtarış nəticələri"
          description="Komandaları, turnirləri və rəsmi rekordları tapın."
        />
        <form
          className="directory-search"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setSearchParams({ q: String(data.get("q") ?? "").trim() });
          }}
        >
          <Input
            key={query}
            name="q"
            label="Axtarış"
            defaultValue={query}
            minLength={2}
            required
          />
          <Button type="submit">Axtar</Button>
        </form>
        {!result ? (
          <LoadingSkeleton variant="list" rows={5} />
        ) : items.length ? (
          <div className="search-results-ledger">
            {items.map((item) => (
              <Link key={`${item.type}-${item.id}`} to={item.href}>
                <span>{item.type}</span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.subtitle}</small>
                </div>
                <ArrowRight size={17} />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nəticə tapılmadı"
            body={
              query
                ? `“${query}” üçün uyğun nəticə yoxdur.`
                : "Axtarış üçün ən azı iki simvol yazın."
            }
          />
        )}
      </div>
    </section>
  );
}
