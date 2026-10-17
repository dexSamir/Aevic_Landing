import erangel640 from './erangel-640.webp';
import erangel1120 from './erangel-1120.webp';
import erangel1672 from './erangel-1672.webp';
import miramar640 from './miramar-640.webp';
import miramar1120 from './miramar-1120.webp';
import miramar1672 from './miramar-1672.webp';
import rondo640 from './rondo-640.webp';
import rondo1120 from './rondo-1120.webp';
import rondo1672 from './rondo-1672.webp';
const responsive = (small: string, medium: string, large: string) => ({src: medium, srcSet: `${small} 640w, ${medium} 1120w, ${large} 1672w`});
export const mapArtwork: Record<string, {src: string; srcSet: string}> = {
  erangel: responsive(erangel640, erangel1120, erangel1672),
  miramar: responsive(miramar640, miramar1120, miramar1672),
  rondo: responsive(rondo640, rondo1120, rondo1672),
};
