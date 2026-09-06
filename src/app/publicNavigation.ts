import { routePath, type routeManifest } from './routeManifest';

type RouteId = typeof routeManifest[number]['id'];
const destination = (id: RouteId, label: string) => ({ to: routePath(id), label, end: true });

// Public information architecture is independent of backend capabilities.
// These destinations either work today or render an intentional unavailable state.
export const publicNavigation = {
  primary: [
    destination('home', 'Ana səhifə'),
    destination('tournaments', 'Turnirlər'),
    destination('teams', 'Komandalar'),
    destination('matches', 'Matçlar'),
  ],
  rules: destination('regulations', 'Qaydalar'),
  login: destination('login', 'Daxil ol'),
  register: destination('register', 'Komanda yarat'),
  secondary: [
    destination('leaderboard', 'Liderlik cədvəli'),
    destination('support', 'Dəstək'),
  ],
  legal: [
    destination('privacy', 'Məxfilik'),
    destination('terms', 'İstifadə şərtləri'),
    destination('contact', 'Əlaqə'),
  ],
};

export const publicFooterNavigation = [...publicNavigation.primary, publicNavigation.rules];
