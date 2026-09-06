import { preloadCriticalFonts } from './app/preloadCriticalFonts';
import './index.css';
// Use the same module identities as component-owned imports. CSS @import here
// would inline a second copy into the async application chunk.
import './styles/components.css';
import './styles/public-shell.css';
import './styles/home.css';
import './styles/motion.css';

// The static Home can paint before the application graph downloads. Vite loads
// each component's owned CSS with the dynamic chunk, before that chunk executes.
preloadCriticalFonts();
void import('./app/startApplication').then(({ startApplication }) => startApplication());
