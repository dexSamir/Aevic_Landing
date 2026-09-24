import { ArrowRight,History,Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import {
EmptyState,
LoadingSkeleton,
PageHeader,
} from "../../components/common/primitives";
import { Seo } from "../../components/common/Seo";
import { services } from "../../services";
import { queryPolicy,usePlatformQuery } from "../../services/queryCache";
import "../../styles/public-pages.css";
import '../../styles/records-archive.css';

export function SeasonArchivePage() {
  const query = usePlatformQuery({
    scope: "public",
    key: "archive",
    query: () => services.archive.seasons(),
    staleTime: queryPolicy.historical,
    retry: 0,
  });
  return (
    <section className="archive-page page-section">
      <Seo
        title="AEVIC Season Archive"
        description="İl və turnir üzrə AEVIC çempionları, nəticələri və recap arxivi."
      />
      <div className="container">
        <PageHeader
          eyebrow="Competition legacy"
          title="Mövsüm arxivi"
          description="İl və turnir üzrə yarış tarixçəsinə keçid. Arxiv mövcud public turnir səhifələrini təkrarlamır."
        />
        {query.loading ? (
          <LoadingSkeleton variant="table" rows={7} />
        ) : query.error && query.data === undefined ? (
          <EmptyState
            title="Arxiv yüklənmədi"
            body="Public archive servisi hazırda cavab vermir."
          />
        ) : !query.data?.length ? (
          <EmptyState
            title="Yarışın yekunu burada qalır"
            body="Hazırda mövsüm arxivi boşdur. Dərc edilən turnirlər tarix və nəticə mənbəyi ilə burada toplanacaq."
            action={
              <Link className="button button--secondary" to="/tournaments">
                Turnir elanlarına bax
              </Link>
            }
          />
        ) : (
          <div className="archive-years">
            {query.data.map((season) => (
              <section key={season.id}>
                <header>
                  <span>{season.year}</span>
                  <h2>{season.label}</h2>
                </header>
                <div>
                  {season.tournaments.map((tournament) => (
                    <article key={tournament.id}>
                      <span className="archive-tournament__icon">
                        {tournament.status === "completed" ? (
                          <Trophy size={20} />
                        ) : (
                          <History size={20} />
                        )}
                      </span>
                      <div>
                        <span>
                          {new Date(tournament.startsAt).toLocaleDateString(
                            "az-AZ",
                            { month: "long", year: "numeric" },
                          )}
                        </span>
                        <h3>{tournament.name}</h3>
                        <p>
                          {tournament.status === "completed"
                            ? "Tamamlanmış turnir · recap və nəticələr mövcud olduqda bağlıdır"
                            : "Aktiv yarış xətti"}
                        </p>
                      </div>
                      <div>
                        <Link to={`/tournaments/${tournament.id}`}>
                          Turnir <ArrowRight size={16} />
                        </Link>
                        {tournament.status === "completed" && (
                          <Link to={`/tournaments/${tournament.id}/recap`}>
                            Recap <ArrowRight size={16} />
                          </Link>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
