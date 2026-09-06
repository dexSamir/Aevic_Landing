import type { RouteObject } from 'react-router-dom';
import { CapabilityUnavailable } from '../components/common/CapabilityUnavailable';
import { serviceCapabilities } from '../services';
import { matchRoute, routeIsAccessible } from './routeManifest';
import { loadRouteStyles } from './routeStyles';

export function applyRouteCapabilities(routes: RouteObject[], parent = ''): RouteObject[] {
  return routes.map((route) => {
    const path = route.path?.startsWith('/') ? route.path : `${parent}${route.path ? `/${route.path}` : ''}`;
    const definition = matchRoute(path);
    const mapped: RouteObject = { ...route };
    if (!mapped.index && mapped.children) mapped.children = applyRouteCapabilities(mapped.children, path);
    if (definition && !routeIsAccessible(definition, serviceCapabilities)) {
      mapped.lazy = undefined;
      mapped.element = undefined;
      mapped.Component = CapabilityUnavailable;
    } else if (typeof route.lazy === 'function') {
      const lazy = route.lazy;
      mapped.lazy = async (...args) => {
        await loadRouteStyles(path);
        return lazy(...args);
      };
    }
    return mapped;
  });
}
