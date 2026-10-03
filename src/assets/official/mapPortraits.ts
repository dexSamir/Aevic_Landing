import map0avif160 from './map-erangel-round-1-portrait-160.avif';
import map0avif320 from './map-erangel-round-1-portrait-320.avif';
import map0avif480 from './map-erangel-round-1-portrait-480.avif';
import map0webp160 from './map-erangel-round-1-portrait-160.webp';
import map0webp320 from './map-erangel-round-1-portrait-320.webp';
import map0webp480 from './map-erangel-round-1-portrait-480.webp';
import map1avif160 from './map-miramar-portrait-160.avif';
import map1avif320 from './map-miramar-portrait-320.avif';
import map1avif480 from './map-miramar-portrait-480.avif';
import map1webp160 from './map-miramar-portrait-160.webp';
import map1webp320 from './map-miramar-portrait-320.webp';
import map1webp480 from './map-miramar-portrait-480.webp';
import map2avif160 from './map-rondo-portrait-160.avif';
import map2avif320 from './map-rondo-portrait-320.avif';
import map2avif480 from './map-rondo-portrait-480.avif';
import map2webp160 from './map-rondo-portrait-160.webp';
import map2webp320 from './map-rondo-portrait-320.webp';
import map2webp480 from './map-rondo-portrait-480.webp';
import map3avif160 from './map-erangel-round-4-portrait-160.avif';
import map3avif320 from './map-erangel-round-4-portrait-320.avif';
import map3avif480 from './map-erangel-round-4-portrait-480.avif';
import map3webp160 from './map-erangel-round-4-portrait-160.webp';
import map3webp320 from './map-erangel-round-4-portrait-320.webp';
import map3webp480 from './map-erangel-round-4-portrait-480.webp';

// Same center crop as the 3:4 map cards, encoded without discarded side pixels.
export const mapPortraitSources = [
  [{ type: 'image/avif' as const, srcSet: `${map0avif160} 160w, ${map0avif320} 320w, ${map0avif480} 480w` }, { type: 'image/webp' as const, srcSet: `${map0webp160} 160w, ${map0webp320} 320w, ${map0webp480} 480w` }],
  [{ type: 'image/avif' as const, srcSet: `${map1avif160} 160w, ${map1avif320} 320w, ${map1avif480} 480w` }, { type: 'image/webp' as const, srcSet: `${map1webp160} 160w, ${map1webp320} 320w, ${map1webp480} 480w` }],
  [{ type: 'image/avif' as const, srcSet: `${map2avif160} 160w, ${map2avif320} 320w, ${map2avif480} 480w` }, { type: 'image/webp' as const, srcSet: `${map2webp160} 160w, ${map2webp320} 320w, ${map2webp480} 480w` }],
  [{ type: 'image/avif' as const, srcSet: `${map3avif160} 160w, ${map3avif320} 320w, ${map3avif480} 480w` }, { type: 'image/webp' as const, srcSet: `${map3webp160} 160w, ${map3webp320} 320w, ${map3webp480} 480w` }]
] as const;
