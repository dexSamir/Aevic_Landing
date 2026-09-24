import {
Bell,
CalendarDays,
ChevronRight,
CircleUserRound,
ExternalLink,
FileText,
GitCompareArrows,
History,
LayoutDashboard,
ListChecks,
MessageSquare,
PanelLeft,
Settings,
ShieldAlert,
Sparkles,
Trophy,
UserRoundCog,
Users
} from 'lucide-react';
import { useState } from 'react';
import { Link,useLocation } from 'react-router-dom';
import { BrandMark } from '../components/brand/BrandMark';
import { RouteTransitionOutlet } from '../components/common/Motion';
import { Drawer,IconButton,StatusBadge,TeamLogo } from '../components/common/primitives';
import { RouteSeo } from '../components/common/Seo';
import { useTeamCompetitionContexts,useTeamPlatformData } from '../services/PlatformDataContext';
import '../styles/public-shell.css';
import type { Team } from '../types/domain';
import { productRouteMetadata,type ProductArea } from '../utils/routeMetadata';
import { SidebarNav } from './WorkspaceNav';

const teamLinks = [
  { to: '/team', label: 'İcmal', icon: LayoutDashboard, group: 'İcmal' },
  { to: '/team/tournaments', label: 'Turnirlərim', icon: Trophy, group: 'Yarış' },
  { to: '/team/disputes', label: 'Nəticə etirazları', icon: FileText, group: 'Yarış' },
  { to: '/team/roster', label: 'Heyət', icon: Users, group: 'Komanda' },
  { to: '/team/roster-requests', label: 'Heyət sorğuları', icon: ListChecks, group: 'Komanda' },
  { to: '/team/invitations', label: 'Dəvətlər', icon: UserRoundCog, group: 'Komanda' },
  { to: '/team/career', label: 'Karyera', icon: Trophy, group: 'Karyera' },
  { to: '/team/history', label: 'Matç tarixçəsi', icon: History, group: 'Karyera' },
  { to: '/team/comparison', label: 'Müqayisə', icon: GitCompareArrows, group: 'Karyera' },
  { to: '/team/sharecards', label: 'Paylaşım studiyası', icon: Sparkles, group: 'Karyera' },
  { to: '/team/notifications', label: 'Bildirişlər', icon: Bell, group: 'Əlaqə' },
  { to: '/team/messages', label: 'Mesajlar', icon: MessageSquare, group: 'Əlaqə' },
  { to: '/team/profile', label: 'Public profil', icon: CircleUserRound, group: 'İdarəetmə' },
  { to: '/team/settings/managers', label: 'Menecerlər', icon: Users, group: 'İdarəetmə' },
  { to: '/team/verification', label: 'Təsdiq', icon: ShieldAlert, group: 'İdarəetmə' },
  { to: '/team/settings', label: 'Ayarlar', icon: Settings, group: 'İdarəetmə' },
];

const adminLinks = [
  { to: '/admin', label: 'Diqqət tələb edənlər', icon: LayoutDashboard, end: true, group: 'Əməliyyatlar' },
  { to: '/admin/roster-requests', label: 'Heyət növbəsi', icon: ListChecks, group: 'Əməliyyatlar' },
  { to: '/admin/disputes', label: 'Etiraz növbəsi', icon: FileText, group: 'Əməliyyatlar' },
  { to: '/admin/check-ins/missed', label: 'Buraxılmış check-in', icon: CalendarDays, group: 'Əməliyyatlar' },
  { to: '/admin/tournaments', label: 'Turnirlər', icon: Trophy, group: 'Yarış' },
  { to: '/admin/results', label: 'Nəticələr', icon: FileText, group: 'Yarış' },
  { to: '/admin/teams', label: 'Komandalar', icon: Users, group: 'Qurumlar' },
  { to: '/admin/organizations', label: 'Təşkilatlar', icon: Sparkles, group: 'Qurumlar' },
  { to: '/admin/verifications', label: 'Təsdiqlər', icon: ShieldAlert, group: 'Qurumlar' },
  { to: '/admin/support', label: 'Dəstək', icon: MessageSquare, group: 'Dəstək' },
  { to: '/admin/messages', label: 'Mesajlar', icon: MessageSquare, group: 'Moderasiya' },
  { to: '/admin/blacklist', label: 'Qara siyahı', icon: ShieldAlert, group: 'Moderasiya' },
  { to: '/admin/audit', label: 'Audit jurnalı', icon: History, group: 'Sistem' },
  { to: '/admin/users', label: 'Admin istifadəçiləri', icon: UserRoundCog, group: 'Sistem' },
  { to: '/admin/settings', label: 'Parametrlər', icon: Settings, group: 'Sistem' },
];

export function productRouteTitle(pathname: string, area: ProductArea) {
  return productRouteMetadata(pathname, area)?.title ?? (area === 'team' ? 'Komanda iş sahəsi' : 'Admin əməliyyatları');
}

function ProductTopbar({ metadata, admin = false, onMenu }: { metadata?: ReturnType<typeof productRouteMetadata>; team?: Team; admin?: boolean; onMenu: () => void }) {
  return <header className="product-topbar"><div className="product-topbar__mobile-identity"><BrandMark variant="compact" /></div><div className="product-topbar__route"><span>{metadata?.parentLabel ?? (admin ? 'Admin' : 'Komanda iş sahəsi')}</span><strong>{metadata?.title ?? (admin ? 'Admin əməliyyatları' : 'Komanda iş sahəsi')}</strong></div><div className="product-topbar__actions">{!admin && <Link className="icon-button" aria-label="Bildirişlər" to="/team/notifications"><Bell size={19} /></Link>}<Link className="icon-button" aria-label={admin ? 'Admin hesabı' : 'Hesab ayarları'} title={admin ? 'Admin hesabı' : 'Hesab ayarları'} to={admin ? '/admin/users' : '/account/profile'}><CircleUserRound size={20} /></Link><IconButton className="product-topbar__menu" label="Naviqasiyanı aç" onClick={onMenu}><PanelLeft size={20} /></IconButton></div></header>;
}

function TeamIdentityBlock({ team, compact = false, onNavigate }: { team: Team; compact?: boolean; onNavigate?: () => void }) {
  const profilePath = `/teams/${encodeURIComponent(team.slug ?? team.id)}`;
  return <div className={compact ? 'team-identity team-identity--drawer drawer-identity' : 'team-identity'}><TeamLogo name={team.name} src={team.logoUrl} /><div className="team-identity__body"><strong title={team.name}>{team.name}</strong>{!compact && <StatusBadge status={team.approvalStatus} />}<Link to={profilePath} onClick={onNavigate}>İctimai profili aç <ExternalLink size={14} aria-hidden="true" /></Link></div></div>;
}

export function TeamLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const { currentTeam: team, notifications: inbox } = useTeamPlatformData();
  const activeContext = useTeamCompetitionContexts().current;
  const unread = inbox.filter((item) => !item.read).length;
  const nextMatch = activeContext?.nextMatch;
  const activeTournament = activeContext?.tournament;
  const tournamentContext = nextMatch && activeTournament ? <Link className="sidebar-note sidebar-note--interactive" to={`/team/tournaments/${activeTournament.id}`} aria-label={`${nextMatch.map}, Raund ${nextMatch.round} turnir əməliyyatlarını aç`}><CalendarDays size={17} aria-hidden="true" /><span>Növbəti matç<strong>{nextMatch.map} · {new Date(nextMatch.startsAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Baku' })}</strong></span><ChevronRight size={16} aria-hidden="true" /></Link> : <div className="sidebar-note sidebar-note--status"><CalendarDays size={17} aria-hidden="true" /><span>Növbəti matç<strong>Hələ planlanmayıb</strong></span></div>;
  return <div className="product-shell product-shell--team"><RouteSeo /><aside className="product-sidebar"><BrandMark variant="navigation" /><TeamIdentityBlock team={team} /><SidebarNav links={teamLinks} unread={unread} />{tournamentContext}</aside><div className="product-main"><ProductTopbar metadata={productRouteMetadata(pathname, 'team')} team={team} onMenu={() => setMenuOpen(true)} /><main id="main-content" className="product-page" tabIndex={-1}>{team?.legacyHistoryIncomplete&&<aside role="status"><p>Əvvəlki tarixçə tam uzlaşdırılmayıb. Statistikalar yalnız yeni sistemdə dərc edilmiş nəticələri əhatə edir.</p>{team.roster.length!==5&&<Link to="/account/legacy-claim">Əvvəlki heyəti real oyunçu ID-ləri ilə tamamla</Link>}</aside>}<RouteTransitionOutlet family="team" /></main></div><Drawer open={menuOpen} title="Komanda paneli" onClose={() => setMenuOpen(false)}><TeamIdentityBlock team={team} compact onNavigate={() => setMenuOpen(false)} /><SidebarNav links={teamLinks} unread={unread} onNavigate={() => setMenuOpen(false)} />{nextMatch && activeTournament && <Link className="drawer-tournament-context" to={`/team/tournaments/${activeTournament.id}`} onClick={() => setMenuOpen(false)}>Növbəti matç · {nextMatch.map} · {new Date(nextMatch.startsAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Baku' })}<ChevronRight size={16} aria-hidden="true" /></Link>}</Drawer></div>;
}

export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  return <div className="product-shell product-shell--admin"><RouteSeo /><aside className="product-sidebar"><BrandMark /><div className="admin-identity"><UserRoundCog size={20} /><div><strong>Yarış əməliyyatları</strong><span>Admin iş sahəsi</span></div></div><SidebarNav links={adminLinks} label="Admin naviqasiyası" /></aside><div className="product-main"><ProductTopbar metadata={productRouteMetadata(pathname, 'admin')} admin onMenu={() => setMenuOpen(true)} /><main id="main-content" className="product-page" tabIndex={-1}><RouteTransitionOutlet family="admin" /></main></div><Drawer open={menuOpen} title="Admin naviqasiyası" onClose={() => setMenuOpen(false)}><SidebarNav links={adminLinks} label="Admin naviqasiyası" onNavigate={() => setMenuOpen(false)} /></Drawer></div>;
}

