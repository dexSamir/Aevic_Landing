import image0webp640 from './login-background-640.webp';
import image0webp1120 from './login-background-1120.webp';
import image0webp1672 from './login-background-1672.webp';
import image0avif640 from './login-background-640.avif';
import image0avif1120 from './login-background-1120.avif';
import image0avif1672 from './login-background-1672.avif';
import image1webp640 from './register-background-640.webp';
import image1webp1120 from './register-background-1120.webp';
import image1webp1672 from './register-background-1672.webp';
import image1avif640 from './register-background-640.avif';
import image1avif1120 from './register-background-1120.avif';
import image1avif1672 from './register-background-1672.avif';
import image2webp640 from './auth-recovery-lock-640.webp';
import image2webp1120 from './auth-recovery-lock-1120.webp';
import image2webp1672 from './auth-recovery-lock-1672.webp';
import image2avif640 from './auth-recovery-lock-640.avif';
import image2avif1120 from './auth-recovery-lock-1120.avif';
import image2avif1672 from './auth-recovery-lock-1672.avif';
import image3webp640 from './public-team-hero-640.webp';
import image3webp1120 from './public-team-hero-1120.webp';
import image3webp1983 from './public-team-hero-1983.webp';
import image3avif640 from './public-team-hero-640.avif';
import image3avif1120 from './public-team-hero-1120.avif';
import image3avif1983 from './public-team-hero-1983.avif';
import image4webp640 from './team-wrapped-phone-640.webp';
import image4webp1024 from './team-wrapped-phone-1024.webp';
import image4avif640 from './team-wrapped-phone-640.avif';
import image4avif1024 from './team-wrapped-phone-1024.avif';
import image5webp640 from './team-share-card-background-640.webp';
import image5webp1120 from './team-share-card-background-1120.webp';
import image5webp1672 from './team-share-card-background-1672.webp';
import image5avif640 from './team-share-card-background-640.avif';
import image5avif1120 from './team-share-card-background-1120.avif';
import image5avif1672 from './team-share-card-background-1672.avif';

export const responsiveArtwork = {
  'login-background': { src: image0webp1672, width: 1672, height: 941, srcSet: `${image0webp640} 640w, ${image0webp1120} 1120w, ${image0webp1672} 1672w`, sources: [{ type: 'image/avif' as const, srcSet: `${image0avif640} 640w, ${image0avif1120} 1120w, ${image0avif1672} 1672w` }] },
  'register-background': { src: image1webp1672, width: 1672, height: 941, srcSet: `${image1webp640} 640w, ${image1webp1120} 1120w, ${image1webp1672} 1672w`, sources: [{ type: 'image/avif' as const, srcSet: `${image1avif640} 640w, ${image1avif1120} 1120w, ${image1avif1672} 1672w` }] },
  'auth-recovery-lock': { src: image2webp1672, width: 1672, height: 941, srcSet: `${image2webp640} 640w, ${image2webp1120} 1120w, ${image2webp1672} 1672w`, sources: [{ type: 'image/avif' as const, srcSet: `${image2avif640} 640w, ${image2avif1120} 1120w, ${image2avif1672} 1672w` }] },
  'public-team-hero': { src: image3webp1983, width: 1983, height: 793, srcSet: `${image3webp640} 640w, ${image3webp1120} 1120w, ${image3webp1983} 1983w`, sources: [{ type: 'image/avif' as const, srcSet: `${image3avif640} 640w, ${image3avif1120} 1120w, ${image3avif1983} 1983w` }] },
  'team-wrapped-phone': { src: image4webp1024, width: 1024, height: 1536, srcSet: `${image4webp640} 640w, ${image4webp1024} 1024w`, sources: [{ type: 'image/avif' as const, srcSet: `${image4avif640} 640w, ${image4avif1024} 1024w` }] },
  'team-share-card-background': { src: image5webp1672, width: 1672, height: 941, srcSet: `${image5webp640} 640w, ${image5webp1120} 1120w, ${image5webp1672} 1672w`, sources: [{ type: 'image/avif' as const, srcSet: `${image5avif640} 640w, ${image5avif1120} 1120w, ${image5avif1672} 1672w` }] },
};
