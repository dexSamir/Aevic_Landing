import { responsiveArtwork } from './responsive';
// User-supplied artwork belongs to the event identity, never its list position or status.
export const featuredTournamentArtwork = { ...responsiveArtwork['featured-daily-cup'], focalDesktop: '24% center', focalMobile: '24% center' };
export const tournamentStripArtwork: Record<string, (typeof responsiveArtwork)['daily-cup-parachutes'] & { focalDesktop: string; focalMobile: string }> = {
  'daily-cup-24': { ...responsiveArtwork['daily-cup-parachutes'], focalDesktop: '62% center', focalMobile: '85% center' },
  'rising-series-26': { ...responsiveArtwork['rising-squads-aircraft'], focalDesktop: '64% 20%', focalMobile: '77% center' },
  'summer-final-25': { ...responsiveArtwork['summer-final-watchtower'], focalDesktop: '68% 18%', focalMobile: '84% center' },
};
