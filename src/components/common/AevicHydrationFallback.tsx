import { BrandEmblem } from '../brand/BrandMark';

export function AevicHydrationFallback() {
  return <main className="hydrate-fallback" aria-busy="true" aria-live="polite"><BrandEmblem /><div><strong>AEVIC hazırlanır</strong><span>Marşrut yüklənir…</span></div></main>;
}
