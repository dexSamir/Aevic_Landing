import type { Tournament } from '../../types/domain';
import { homeArtwork } from '../../assets/home';
import { CompetitionFeature } from './CompetitionFeature';
import { TournamentCalendar } from './TournamentCalendar';

/** Only needed once Home has a published competition to display. */
export default function HomeCompetitionProgram({ featured, tournaments }: { featured: Tournament; tournaments: Tournament[] }) {
  return <><div className="home-tournament-visual" data-reveal data-reveal-variant="mask-reveal"><CompetitionFeature tournament={featured} artwork={homeArtwork.tournament} /></div><div className="home-competition-program__calendar"><TournamentCalendar tournaments={tournaments} compact overview /></div></>;
}
