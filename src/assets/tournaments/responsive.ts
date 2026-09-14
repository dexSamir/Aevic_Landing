import image0webp640 from './summer-final-watchtower-640.webp';
import image0webp1120 from './summer-final-watchtower-1120.webp';
import image0webp1918 from './summer-final-watchtower-1918.webp';
import image0avif640 from './summer-final-watchtower-640.avif';
import image0avif1120 from './summer-final-watchtower-1120.avif';
import image0avif1918 from './summer-final-watchtower-1918.avif';
import image1webp640 from './tournament-detail-hero-640.webp';
import image1webp1120 from './tournament-detail-hero-1120.webp';
import image1webp1983 from './tournament-detail-hero-1983.webp';
import image1avif640 from './tournament-detail-hero-640.avif';
import image1avif1120 from './tournament-detail-hero-1120.avif';
import image1avif1983 from './tournament-detail-hero-1983.avif';
import image2webp640 from './rising-squads-aircraft-640.webp';
import image2webp1120 from './rising-squads-aircraft-1120.webp';
import image2webp1918 from './rising-squads-aircraft-1918.webp';
import image2avif640 from './rising-squads-aircraft-640.avif';
import image2avif1120 from './rising-squads-aircraft-1120.avif';
import image2avif1918 from './rising-squads-aircraft-1918.avif';
import image3webp640 from './featured-daily-cup-640.webp';
import image3webp1120 from './featured-daily-cup-1120.webp';
import image3webp1947 from './featured-daily-cup-1947.webp';
import image3avif640 from './featured-daily-cup-640.avif';
import image3avif1120 from './featured-daily-cup-1120.avif';
import image3avif1947 from './featured-daily-cup-1947.avif';
import image4webp640 from './daily-cup-parachutes-640.webp';
import image4webp1120 from './daily-cup-parachutes-1120.webp';
import image4webp1919 from './daily-cup-parachutes-1919.webp';
import image4avif640 from './daily-cup-parachutes-640.avif';
import image4avif1120 from './daily-cup-parachutes-1120.avif';
import image4avif1919 from './daily-cup-parachutes-1919.avif';

export const responsiveArtwork = {
  'summer-final-watchtower': { src: image0webp1918, width: 1918, height: 820, srcSet: `${image0webp640} 640w, ${image0webp1120} 1120w, ${image0webp1918} 1918w`, sources: [{ type: 'image/avif' as const, srcSet: `${image0avif640} 640w, ${image0avif1120} 1120w, ${image0avif1918} 1918w` }] },
  'tournament-detail-hero': { src: image1webp1983, width: 1983, height: 793, srcSet: `${image1webp640} 640w, ${image1webp1120} 1120w, ${image1webp1983} 1983w`, sources: [{ type: 'image/avif' as const, srcSet: `${image1avif640} 640w, ${image1avif1120} 1120w, ${image1avif1983} 1983w` }] },
  'rising-squads-aircraft': { src: image2webp1918, width: 1918, height: 820, srcSet: `${image2webp640} 640w, ${image2webp1120} 1120w, ${image2webp1918} 1918w`, sources: [{ type: 'image/avif' as const, srcSet: `${image2avif640} 640w, ${image2avif1120} 1120w, ${image2avif1918} 1918w` }] },
  'featured-daily-cup': { src: image3webp1947, width: 1947, height: 808, srcSet: `${image3webp640} 640w, ${image3webp1120} 1120w, ${image3webp1947} 1947w`, sources: [{ type: 'image/avif' as const, srcSet: `${image3avif640} 640w, ${image3avif1120} 1120w, ${image3avif1947} 1947w` }] },
  'daily-cup-parachutes': { src: image4webp1919, width: 1919, height: 820, srcSet: `${image4webp640} 640w, ${image4webp1120} 1120w, ${image4webp1919} 1919w`, sources: [{ type: 'image/avif' as const, srcSet: `${image4avif640} 640w, ${image4avif1120} 1120w, ${image4avif1919} 1919w` }] },
};
