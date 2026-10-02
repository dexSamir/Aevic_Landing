import { TeamWorkspacePlaceholder } from '../../layouts/TeamWorkspaceFrame';
import { BrandEmblem } from '../brand/BrandMark';

export function AevicHydrationFallback() {
  if (typeof window !== 'undefined' && /^\/team(?:\/|$)/.test(window.location.pathname)) return <TeamWorkspacePlaceholder phase="route" />;
  return <main className="hydrate-fallback" aria-busy="true" aria-live="polite"><BrandEmblem /><div><strong>AEVIC hazırlanır</strong><span>Marşrut yüklənir…</span></div></main>;
}
