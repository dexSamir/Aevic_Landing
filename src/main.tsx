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
void import('./app/startApplication').then(({ startApplication }) => startApplication()).catch(() => {
  // A failed startup chunk must show a retry instead of leaving an empty screen.
  // Do not log the URL: recovery links may contain a private token in the fragment.
  const root = document.getElementById('root');
  if (!root) return;
  const message = document.createElement('p');
  message.textContent = 'Səhifə yüklənmədi. Yenidən cəhd edin.';
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'button button--primary';
  retry.textContent = 'Yenidən yüklə';
  retry.addEventListener('click', () => window.location.reload());
  const panel = document.createElement('main');
  panel.setAttribute('role', 'alert');
  panel.style.padding = '2rem';
  panel.append(message, retry);
  root.replaceChildren(panel);
});
