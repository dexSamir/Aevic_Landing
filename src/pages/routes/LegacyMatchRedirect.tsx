import { Navigate,useParams } from "react-router-dom";
import {
EmptyState,
LoadingSkeleton
} from "../../components/common/primitives";
import { services } from "../../services";
import { queryPolicy,usePlatformQuery } from "../../services/queryCache";
import "../../styles/public-pages.css";
import '../../styles/records-archive.css';

export function LegacyMatchRedirect() {
  const { matchId = "" } = useParams();
  const query = usePlatformQuery({
    scope: "public",
    key: `match:${matchId}`,
    query: () => services.publicMatches.get(matchId),
    staleTime: queryPolicy.publicCompetition,
    retry: 0,
  });
  if (query.loading)
    return (
      <section className="page-section">
        <div className="container">
          <LoadingSkeleton variant="table" rows={6} />
        </div>
      </section>
    );
  if (query.error && query.data === undefined)
    return (
      <section className="page-section">
        <div className="container">
          <EmptyState
            title="Matç yüklənmədi"
            body="Public nəticə servisi hazırda cavab vermir."
          />
        </div>
      </section>
    );
  const detail = query.data;
  if (!detail) return <Navigate replace to="/matches" />;
  const target = detail.published ? "results" : "matches";
  return (
    <Navigate
      replace
      to={`/tournaments/${detail.tournament.id}#${target}`}
      state={{
        roundId: detail.match.id,
        redirectedFrom: `/matches/${matchId}`,
      }}
    />
  );
}
