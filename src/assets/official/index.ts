import authBackdrop from './auth-aevic-arena-1586.jpg';
import authBackdrop480 from './auth-aevic-arena-480.jpg';
import authBackdrop960 from './auth-aevic-arena-960.jpg';
import authBackdrop1440 from './auth-aevic-arena-1440.jpg';
import authAvif480 from './auth-aevic-arena-480.avif';
import authAvif960 from './auth-aevic-arena-960.avif';
import authAvif1440 from './auth-aevic-arena-1440.avif';
import authAvif1586 from './auth-aevic-arena-1586.avif';
import authWebp480 from './auth-aevic-arena-480.webp';
import authWebp960 from './auth-aevic-arena-960.webp';
import authWebp1440 from './auth-aevic-arena-1440.webp';
import authWebp1586 from './auth-aevic-arena-1586.webp';
import mapErangelRound1 from './map-erangel-round-1.webp';
import mapErangelRound1320 from './map-erangel-round-1-320.webp';
import mapErangelRound1640 from './map-erangel-round-1-640.webp';
import mapErangelRound1960 from './map-erangel-round-1-960.webp';
import mapErangelRound4 from './map-erangel-round-4.webp';
import mapErangelRound4320 from './map-erangel-round-4-320.webp';
import mapErangelRound4640 from './map-erangel-round-4-640.webp';
import mapErangelRound4960 from './map-erangel-round-4-960.webp';
import mapMiramar from './map-miramar.webp';
import mapMiramar320 from './map-miramar-320.webp';
import mapMiramar640 from './map-miramar-640.webp';
import mapMiramar960 from './map-miramar-960.webp';
import mapRondo from './map-rondo.webp';
import mapRondo320 from './map-rondo-320.webp';
import mapRondo640 from './map-rondo-640.webp';
import mapRondo960 from './map-rondo-960.webp';

const maps = [mapErangelRound1, mapMiramar, mapRondo, mapErangelRound4] as const;

export const officialAssets = {
  authBackdrop,
  authBackdropSrcSet: `${authBackdrop480} 480w, ${authBackdrop960} 960w, ${authBackdrop1440} 1440w, ${authBackdrop} 1586w`,
  authBackdropSources: [
    {type:'image/avif' as const,srcSet:`${authAvif480} 480w, ${authAvif960} 960w, ${authAvif1440} 1440w, ${authAvif1586} 1586w`},
    {type:'image/webp' as const,srcSet:`${authWebp480} 480w, ${authWebp960} 960w, ${authWebp1440} 1440w, ${authWebp1586} 1586w`},
  ],
  maps,
  mapsSmall: [mapErangelRound1640, mapMiramar640, mapRondo640, mapErangelRound4640],
  mapSrcSets: [
    `${mapErangelRound1320} 320w, ${mapErangelRound1640} 640w, ${mapErangelRound1960} 960w, ${mapErangelRound1} 1600w`,
    `${mapMiramar320} 320w, ${mapMiramar640} 640w, ${mapMiramar960} 960w, ${mapMiramar} 1600w`,
    `${mapRondo320} 320w, ${mapRondo640} 640w, ${mapRondo960} 960w, ${mapRondo} 1600w`,
    `${mapErangelRound4320} 320w, ${mapErangelRound4640} 640w, ${mapErangelRound4960} 960w, ${mapErangelRound4} 1600w`,
  ],
} as const;

export const officialRotation = ['Erangel', 'Miramar', 'Rondo', 'Erangel'] as const;
