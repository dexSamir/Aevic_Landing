import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { publicFooterNavigation, publicNavigation } from '../src/app/publicNavigation';
import { matchRoute, routeIsAccessible, routeIsAvailable } from '../src/app/routeManifest';
import { createServiceCapabilities } from '../src/services/capabilities';
import { PublicHeader } from '../src/layouts/layouts';
import { PublicFooter } from '../src/layouts/PublicFooter';
import { LoginPage, RegisterPage } from '../src/pages/AuthPages';
import { MatchCenterPage } from '../src/pages/SpectatorPages';
import { SocialLinks } from '../src/components/social/SocialLinks';
import { serviceCapabilities, services } from '../src/services';

vi.mock('../src/services', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/services')>();
  return { ...actual, serviceCapabilities: { ...actual.serviceCapabilities } };
});
afterEach(() => { Object.assign(serviceCapabilities, createServiceCapabilities('mock')); vi.restoreAllMocks(); });

const primary = ['/', '/tournaments', '/teams', '/matches'];
const footerPaths = [...primary, '/regulations', '/leaderboard', '/support', '/privacy', '/terms', '/contact'];

describe('public IA is independent of backend availability', () => {
  it('derives valid, unique current destinations from the route manifest', () => {
    const links = [...publicFooterNavigation, ...publicNavigation.secondary, ...publicNavigation.legal];
    expect(links.map((link) => link.to)).toEqual(footerPaths);
    expect(new Set(links.map((link) => link.to)).size).toBe(links.length);
    for (const link of [...links, publicNavigation.login, publicNavigation.register]) {
      expect(matchRoute(link.to)?.path).toBe(link.to);
      expect(link.to).not.toMatch(/^\/players/);
      expect(routeIsAccessible(matchRoute(link.to)!, createServiceCapabilities('api'))).toBe(true);
    }
    for (const path of ['/login', '/register', '/matches']) {
      expect(routeIsAvailable(matchRoute(path)!, createServiceCapabilities('api'))).toBe(false);
    }
    for (const path of ['/admin', '/team', '/account', '/matches/a']) {
      expect(routeIsAccessible(matchRoute(path)!, createServiceCapabilities('api'))).toBe(false);
    }
  });

  it.each(['mock', 'api'] as const)('renders anonymous desktop and mobile actions in %s mode', async (mode) => {
    Object.assign(serviceCapabilities, createServiceCapabilities(mode));
    const getSession = vi.spyOn(services.auth, 'getSession').mockResolvedValue(null);
    render(<MemoryRouter><PublicHeader /><PublicFooter /></MemoryRouter>);
    const nav = screen.getByRole('navigation', { name: 'Əsas naviqasiya' });
    expect(within(nav).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(primary);
    const header = screen.getByRole('banner');
    expect(within(header).getByRole('link', { name: 'Daxil ol' })).toHaveAttribute('href', '/login');
    expect(within(header).getByRole('link', { name: 'Komanda yarat' })).toHaveAttribute('href', '/register');
    fireEvent.click(screen.getByRole('button', { name: 'Menyunu aç' }));
    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([...primary, '/regulations', '/login', '/register']);
    expect(within(screen.getByRole('contentinfo')).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['/', ...footerPaths]);
    if (mode === 'api') expect(getSession).not.toHaveBeenCalled();
    else await waitFor(() => expect(getSession).toHaveBeenCalled());
  });

  it('preserves authenticated mock identity without changing discovery destinations', async () => {
    const session = { user: { id: 'test-admin', firstName: 'Test admin' }, role: 'admin' } as Awaited<ReturnType<typeof services.auth.getSession>>;
    vi.spyOn(services.auth, 'getSession').mockResolvedValue(session);
    render(<MemoryRouter><PublicHeader /></MemoryRouter>);
    expect(await screen.findByRole('button', { name: 'Test admin hesab menyusu' })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Əsas naviqasiya' })).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(primary);
    expect(screen.queryByRole('link', { name: 'Daxil ol' })).not.toBeInTheDocument();
  });
});

describe('unavailable public pages never invoke missing APIs', () => {
  it('keeps login and registration editable while blocking unavailable server calls', async () => {
    Object.assign(serviceCapabilities, createServiceCapabilities('api'));
    const login = vi.spyOn(services.auth, 'login');
    const name = vi.spyOn(services.registration, 'checkTeamName');
    const submit = vi.spyOn(services.registration, 'submit');
    const lookup = vi.spyOn(services.registration, 'lookupPlayer');
    const eligibility = vi.spyOn(services.registration, 'validatePlayer');
    const loginView = render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(screen.getByRole('status')).toHaveTextContent('Hesaba giriş hazırda aktiv deyil');
    const email = screen.getByLabelText('E-poçt');
    const password = screen.getByLabelText('Şifrə');
    const remember = screen.getByRole('checkbox', { name: 'Məni xatırla' });
    expect(email).toBeEnabled();
    expect(password).toBeEnabled();
    expect(remember).toBeEnabled();
    fireEvent.change(email, { target: { value: 'captain@example.test' } });
    fireEvent.change(password, { target: { value: 'demo-password' } });
    fireEvent.click(remember);
    fireEvent.click(screen.getByRole('button', { name: 'Şifrəni göstər' }));
    expect(email).toHaveValue('captain@example.test');
    expect(password).toHaveValue('demo-password');
    expect(password).toHaveAttribute('type', 'text');
    expect(remember).toBeChecked();
    fireEvent.submit(loginView.container.querySelector('form')!);
    expect(screen.getByRole('status')).toHaveTextContent('serverə giriş sorğusu göndərilmir');
    loginView.unmount();
    const registerView = render(<MemoryRouter><RegisterPage /></MemoryRouter>);
    const teamName = registerView.container.querySelector('#teamName')!;
    expect(teamName).toBeEnabled();
    fireEvent.change(teamName, { target: { value: 'Test team' } });
    expect(teamName).toHaveValue('Test team');
    fireEvent.submit(registerView.container.querySelector('form')!);
    expect(screen.getByLabelText('Ad')).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Ad'), { target: { value: 'Murad' } });
    expect(screen.getByLabelText('Ad')).toHaveValue('Murad');
    await new Promise((resolve) => setTimeout(resolve, 600));
    for (const spy of [login, name, submit, lookup, eligibility]) expect(spy).not.toHaveBeenCalled();
  });

  it('renders the existing Match Center empty state without fetching data', () => {
    Object.assign(serviceCapabilities, createServiceCapabilities('api'));
    const schedule = vi.spyOn(services.publicMatches, 'schedule');
    const history = vi.spyOn(services.publicMatches, 'history');
    const tournaments = vi.spyOn(services.tournaments, 'list');
    render(<MemoryRouter><MatchCenterPage /></MemoryRouter>);
    expect(screen.getByText('Növbəti raundu buradan izləyin')).toBeInTheDocument();
    for (const spy of [schedule, history, tournaments]) expect(spy).not.toHaveBeenCalled();
  });

  it('omits placeholder/unsafe socials and protects configured outbound links', () => {
    render(<SocialLinks ownerName="AEVIC Esports" compact links={{ instagram: 'https://www.instagram.com/aevic/', discord: '#', x: 'javascript:alert(1)', linkedin: 'https://wrong.example/company/aevic' }} />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName('AEVIC Esports — Instagram');
    expect(links[0]).toHaveAttribute('target', '_blank');
    expect(links[0]).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
