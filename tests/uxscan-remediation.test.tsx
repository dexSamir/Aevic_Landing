import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { createServiceCapabilities } from '../src/services/capabilities';
import { TournamentCalendar } from '../src/components/competition/TournamentCalendar';

describe('UXScan remediation contracts', () => {
  it('short-circuits an empty tournament calendar into anticipation and one useful action', () => {
    const view = render(<MemoryRouter><TournamentCalendar tournaments={[]} compact /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Növbəti yarış elanları burada yayımlanacaq' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Komandanı hazırla/i })).toHaveAttribute('href', '/register');
    expect(view.container.querySelectorAll('.tournament-calendar__days button')).toHaveLength(0);
    expect(view.container.querySelectorAll('.tournament-calendar__strip button')).toHaveLength(0);
  });

  it('gates unsupported production probes instead of masking failed responses', () => {
    const capabilities = createServiceCapabilities('api');
    const homePage = readFileSync('src/pages/HomePage.tsx', 'utf8');
    const layouts = readFileSync('src/layouts/layouts.tsx', 'utf8');
    expect(capabilities).toMatchObject({ publicSession: true, publicPlayers: false, publicRecords: true, login: true, register: true, teamWorkspace: true, adminWorkspace: true });
    expect(layouts).toContain('if (!serviceCapabilities.publicSession)');
    expect(homePage).not.toContain('services.players.list(');
    expect(homePage).toContain('if (!serviceCapabilities.publicRecords)');
  });

  it('keeps application-owned HTML injection sinks out of source', () => {
    const home = readFileSync('src/pages/HomePage.tsx', 'utf8');
    const team = readFileSync('src/pages/TeamPages.tsx', 'utf8');
    expect(home).not.toContain('dangerouslySetInnerHTML');
    expect(team).not.toContain('dangerouslySetInnerHTML');
  });

  it('owns route styles through static imports in lazy route modules', () => {
    const router = readFileSync('src/app/router.tsx', 'utf8');
    expect(router).not.toContain('loadRouteStyles');
    expect(router).toContain("lazy: () => import('./TeamRoute')");
    const teamRoute = readFileSync('src/app/TeamRoute.tsx', 'utf8');
    expect(teamRoute).toContain("import './workspaceStyles';");
    expect(teamRoute).toContain("import '../styles/team-workspace.css';");
    expect(readFileSync('src/pages/AuthPages.tsx', 'utf8')).toContain("import '../styles/auth.css';");
    expect(readFileSync('src/pages/ProfilePages.tsx', 'utf8')).toContain("import '../styles/public-pages.css';");
    expect(readFileSync('src/main.tsx', 'utf8')).not.toContain('routeStyles');
  });

  it('retains checked-in image fallbacks when a selected transform fails', () => {
    const delivery = readFileSync('src/assets/imageDelivery.ts', 'utf8');
    expect(delivery).toContain("fit: 'contain'");
    expect(delivery).not.toContain("fit: 'cover'");
    const backdrop = readFileSync('src/components/common/MediaBackdrop.tsx', 'utf8');
    expect(delivery).toContain("querySelectorAll('source')");
    expect(delivery).toContain("image.src = fallbackSource");
    expect(backdrop).toContain('restoreLocalImageFallback(event, src)');
  });
});
