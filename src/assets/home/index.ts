import participation1600avif from './participation-1600.avif';
import participation1600webp from './participation-1600.webp';
import participation1600jpg from './participation-1600.jpg';
import hero480jpg from './hero-480.jpg';
import hero800jpg from './hero-800.jpg';
import hero480webp from './hero-480.webp';
import hero800webp from './hero-800.webp';
import hero480avif from './hero-480.avif';
import hero800avif from './hero-800.avif';
import participation480jpg from './participation-480.jpg';
import participation800jpg from './participation-800.jpg';
import participation480webp from './participation-480.webp';
import participation800webp from './participation-800.webp';
import participation480avif from './participation-480.avif';
import participation800avif from './participation-800.avif';
// Responsive encodings of the four user-supplied Home artworks; no generated imagery.
import hero640jpg from './hero-640.jpg';
import hero640webp from './hero-640.webp';
import hero640avif from './hero-640.avif';
import hero1120jpg from './hero-1120.jpg';
import hero1120webp from './hero-1120.webp';
import hero1120avif from './hero-1120.avif';
import hero1672jpg from './hero-1672.jpg';
import hero1672webp from './hero-1672.webp';
import hero1672avif from './hero-1672.avif';
import tournament480jpg from './tournament-480.jpg';
import tournament480webp from './tournament-480.webp';
import tournament480avif from './tournament-480.avif';
import tournament800jpg from './tournament-800.jpg';
import tournament800webp from './tournament-800.webp';
import tournament800avif from './tournament-800.avif';
import tournament1254jpg from './tournament-1254.jpg';
import tournament1254webp from './tournament-1254.webp';
import tournament1254avif from './tournament-1254.avif';
import participation640jpg from './participation-640.jpg';
import participation640webp from './participation-640.webp';
import participation640avif from './participation-640.avif';
import participation1280jpg from './participation-1280.jpg';
import participation1280webp from './participation-1280.webp';
import participation1280avif from './participation-1280.avif';
import participation2048jpg from './participation-2048.jpg';
import participation2048webp from './participation-2048.webp';
import participation2048avif from './participation-2048.avif';

export const homeArtwork = {
  hero: { src: hero1672jpg, srcSet: `${hero480jpg} 480w, ${hero640jpg} 640w, ${hero800jpg} 800w, ${hero1120jpg} 1120w, ${hero1672jpg} 1672w`, sources: [{type: 'image/avif', srcSet: `${hero480avif} 480w, ${hero640avif} 640w, ${hero800avif} 800w, ${hero1120avif} 1120w, ${hero1672avif} 1672w`}, {type: 'image/webp', srcSet: `${hero480webp} 480w, ${hero640webp} 640w, ${hero800webp} 800w, ${hero1120webp} 1120w, ${hero1672webp} 1672w`}], width: 1672, height: 941 },
  tournament: { src: tournament1254jpg, srcSet: `${tournament480jpg} 480w, ${tournament800jpg} 800w, ${tournament1254jpg} 1254w`, sources: [{type: 'image/avif', srcSet: `${tournament480avif} 480w, ${tournament800avif} 800w, ${tournament1254avif} 1254w`}, {type: 'image/webp', srcSet: `${tournament480webp} 480w, ${tournament800webp} 800w, ${tournament1254webp} 1254w`}], width: 1254, height: 1254 },
  participation: { src: participation2048jpg, srcSet: `${participation480jpg} 480w, ${participation640jpg} 640w, ${participation800jpg} 800w, ${participation1280jpg} 1280w, ${participation1600jpg} 1600w, ${participation2048jpg} 2048w`, sources: [{type: 'image/avif', srcSet: `${participation480avif} 480w, ${participation640avif} 640w, ${participation800avif} 800w, ${participation1280avif} 1280w, ${participation1600avif} 1600w, ${participation2048avif} 2048w`}, {type: 'image/webp', srcSet: `${participation480webp} 480w, ${participation640webp} 640w, ${participation800webp} 800w, ${participation1280webp} 1280w, ${participation1600webp} 1600w, ${participation2048webp} 2048w`}], width: 2048, height: 768 }
} as const;

export type HomeArtwork = (typeof homeArtwork)[keyof typeof homeArtwork];
