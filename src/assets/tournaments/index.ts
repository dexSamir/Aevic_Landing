import featured from './featured-daily-cup.png';
import daily from './daily-cup-parachutes.png';
import rising from './rising-squads-aircraft.png';
import summer from './summer-final-watchtower.png';

// User-supplied artwork belongs to the event identity, never its list position or status.
export const featuredTournamentArtwork = { src: featured, width: 1947, height: 808, focalDesktop: '24% center', focalMobile: '24% center' };
export const tournamentStripArtwork: Record<string, { src: string; width: number; height: number; focalDesktop: string; focalMobile: string }> = {
  'daily-cup-24': { src: daily, width: 1919, height: 820, focalDesktop: '62% center', focalMobile: '85% center' },
  'rising-series-26': { src: rising, width: 1918, height: 820, focalDesktop: '64% 20%', focalMobile: '77% center' },
  'summer-final-25': { src: summer, width: 1918, height: 820, focalDesktop: '68% 18%', focalMobile: '84% center' },
};
