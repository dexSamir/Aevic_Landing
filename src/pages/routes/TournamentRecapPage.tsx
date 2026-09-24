import '../../styles/records-archive.css';
import {
ArrowRight,
CalendarDays,
Crown,
History,
Medal,
Swords,
Trophy
} from "lucide-react";
import { useEffect,useState } from "react";
import { Link,useParams } from "react-router-dom";
import {
EmptyState,
LoadingSkeleton,
SectionHeading,
TeamLogo
} from "../../components/common/primitives";
import { services } from "../../services";
import "../../styles/public-pages.css";
import type { TournamentRecapData } from "../../types/domain";
import { ShareRecap } from './PublicArchivePagesShared';
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
