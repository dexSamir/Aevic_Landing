import { matchRoute } from '../app/routeManifest.js';
export type ProductArea = 'team' | 'admin';
export interface ProductRouteMetadata { family: ProductArea; section: string; title: string; parentLabel: string }
export function productRouteMetadata(pathname: string, area: ProductArea): ProductRouteMetadata | undefined {
  const route = matchRoute(pathname);
  if (!route || route.family.toLowerCase() !== area) return undefined;
  return { family: area, section: route.section, title: route.title, parentLabel: area === 'team' ? 'Komanda iş sahəsi' : 'Admin' };
}
export function publicNavigationFamily(pathname: string): '/' | '/tournaments' | '/teams' | '/matches' | '' {
  return (matchRoute(pathname)?.navigation ?? '') as '/' | '/tournaments' | '/teams' | '/matches' | '';
}
