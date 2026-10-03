import { lazy, Suspense } from 'react';
import { BrandEmblem } from '../brand/BrandMark';

const TeamWorkspacePlaceholder = lazy(() => import('../../layouts/TeamWorkspaceFrame').then(module => ({ default: module.TeamWorkspacePlaceholder })));

function PublicFallback() {
  return <main className="hydrate-fallback" aria-busy="true" aria-live="polite"><BrandEmblem /><div><strong>AEVIC hazırlanır</strong><span>Marşrut yüklənir…</span></div></main>;
}

export function AevicHydrationFallback() {
  if (typeof window !== 'undefined' && /^\/team(?:\/|$)/.test(window.location.pathname)) return <Suspense fallback={<PublicFallback />}><TeamWorkspacePlaceholder phase="route" /></Suspense>;
  return <PublicFallback />;
}
