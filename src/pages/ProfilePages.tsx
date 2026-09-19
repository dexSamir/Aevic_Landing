import { usePlatformQuery } from '../services/queryCache';
import '../styles/public-pages.css';
import { PublicTeamDetail } from '../components/profile/PublicTeamDetail';
import { DirectoryTeamCard } from '../components/profile/DirectoryTeamCard';
import { featuredTournamentArtwork } from '../assets/tournaments';
import { sanitizeOutboundUrl } from '../utils/outboundUrl';
import { ArrowRight, GitCompareArrows, X, CalendarDays, Flag, Gamepad2, Globe2, Search, Swords } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BadgeCabinetEditor, BadgeCollectionDrawer, FeaturedBadgeCabinet } from '../components/team/BadgeCabinet';
import { OrganizationBanner, OrganizationIdentity, SocialLinkList, VerificationCrest } from '../components/profile/ProfileElements';
import { Button, EmptyState, LoadingSkeleton, PageHeader, SectionHeading, Select, StatusBadge, TeamLogo } from '../components/common/primitives';
import { TeamComparison } from '../components/team/TeamExperience';
import { MediaBackdrop } from '../components/common/MediaBackdrop';
import { competitionNow, serviceCapabilities, services } from '../services';
import { useAdminPlatformData, usePublicPlatformData, useTeamPlatformData } from '../services/PlatformDataContext';
import type { PublicTeamProfile } from '../types/domain';
import { resolveTournamentTemporalPhase } from '../utils/tournamentTime';
import { organizationTeamPath } from '../utils/routes';

const emptyDirectoryTournaments: import('../types/domain').Tournament[] = [];

export function TeamsDirectoryPage() {
  const { teams: teamsList, teamComparisonRecords = [], tournaments = emptyDirectoryTournaments } = usePublicPlatformData(); const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('default');
  const selectedTeams = selectedIds.map(id => teamsList.find(team => team.id === id)).filter(team => team !== undefined);
  const toggleTeam = (id: string) => {
    setFeedback('');
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(value => value !== id));
    else if (selectedIds.length < 2) setSelectedIds([...selectedIds, id]);
    else setFeedback('Əvvəlcə seçilmiş komandalardan birini çıxarın.');
  };
  const cancelCompare = () => { setCompareMode(false); setSelectedIds([]); setFeedback(''); };

  const visible = useMemo(() => teamsList.filter((team) => team.name.toLocaleLowerCase('az').includes(query.trim().toLocaleLowerCase('az')) && (status === 'all' || team.verificationLevel === status)).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name, 'az') : sort === 'roster' ? b.rosterSize - a.rosterSize : 0), [query, teamsList, status, sort]);
  const [ownTeamId, setOwnTeamId] = useState<string>();
  const [registrations, setRegistrations] = useState<Record<string, { label: string; tournamentId: string }>>({});
  useEffect(() => {
    let active = true;
    if (serviceCapabilities.publicSession) void services.auth.getSession().then(async session => {
      const team = session && ['captain', 'team', 'admin'].includes(session.role) ? await services.teams.current() : undefined;
      if (active) setOwnTeamId(team?.id);
    }).catch(() => { if (active) setOwnTeamId(undefined); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    const now = competitionNow();
    const relevant = tournaments.filter(tournament => ['live', 'registration-open', 'upcoming', 'registration-closed'].includes(resolveTournamentTemporalPhase(tournament, now)))
      .sort((a, b) => Number(resolveTournamentTemporalPhase(b, now) === 'live') - Number(resolveTournamentTemporalPhase(a, now) === 'live') || Date.parse(a.startsAt) - Date.parse(b.startsAt));
    void Promise.allSettled(relevant.map(async tournament => ({ tournament, slots: await services.tournaments.slots(tournament.id) }))).then(results => {
      const next: Record<string, { label: string; tournamentId: string }> = {};
      for (const result of results) if (result.status === 'fulfilled') {
        const { tournament, slots } = result.value;
        for (const slot of slots) if (slot.teamId && slot.state === 'occupied' && !next[slot.teamId]) next[slot.teamId] = { tournamentId: tournament.id, label: `${resolveTournamentTemporalPhase(tournament, now) === 'live' ? 'Canlı' : 'Qeydiyyatda'}: ${tournament.shortName}` };
      }
      if (active) setRegistrations(next);
    });
    return () => { active = false; };
  }, [tournaments]);
  const sourceEmpty = teamsList.length === 0;
  return <><section className="teams-directory"><header className="directory-hero"><MediaBackdrop {...featuredTournamentArtwork} className="directory-hero__media" focalDesktop="15% center" focalMobile="24% center" sizes="100vw" priority /><div className="container"><span>// &nbsp; PUBLIC TEAMS</span><h1>AEVIC<br /><em>Komandaları</em></h1><p>Təsdiqlənmiş komanda kimlikləri, heyətlər və dərc edilmiş yarış tarixçəsi.<br />PUBG Mobile icmasında ən yaxşı komandaları kəşf et.</p><small>AD AETERNAM VICTORIAM.</small></div></header><div className="container">{!sourceEmpty && <div className={`teams-directory__discovery${compareMode ? ' is-comparing' : ''}`}><label className="search-field teams-directory__search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Komanda adı ilə axtar..." aria-label="Komanda adı ilə axtar" /></label><Select label="Status" value={status} onChange={event => setStatus(event.target.value)}><option value="all">Hamısı</option><option value="registered">Qeydiyyatlı</option><option value="approved">Təsdiqlənmiş</option><option value="verified">Doğrulanmış</option><option value="legacy">Legacy</option></Select><Select label="Sırala" value={sort} onChange={event => setSort(event.target.value)}><option value="default">Standart</option><option value="name">Ad üzrə</option><option value="roster">Heyət sayı</option></Select><div className="teams-directory__compare-control">{!compareMode ? <Button size="lg" variant="secondary" icon={<GitCompareArrows size={17} />} onClick={() => setCompareMode(true)}>Müqayisə et</Button> : <><span className="teams-directory__compare-progress" role="status">{selectedIds.length} / 2 seçilib<span className="sr-only">{feedback && ` · ${feedback}`}</span></span><Button className="directory-compare-cancel" size="lg" variant="secondary" aria-label="Ləğv et" title="Müqayisəni ləğv et" icon={<X size={17} />} onClick={cancelCompare}><span className="sr-only">Ləğv et</span></Button>{selectedTeams.length === 2 && <Button size="lg" onClick={() => navigate(`/teams/compare?${new URLSearchParams({ team: selectedTeams[0].slug, opponent: selectedTeams[1].slug })}`)}>Komandaları müqayisə et</Button>}</>}</div><div className="teams-directory__count" aria-live="polite"><span>GÖRÜNƏN KOMANDA PROFİLİ</span><strong>{String(visible.length).padStart(2, '0')}</strong></div></div>}{visible.length ? <div className="team-directory-grid" role="list" aria-label={`${visible.length} public komanda`}>{visible.map((team, index) => <DirectoryTeamCard key={team.id} team={team} ordinal={index + 1} compareMode={compareMode} selected={compareMode && selectedIds.includes(team.id)} ownTeam={ownTeamId === team.id} registration={registrations[team.id]} record={teamComparisonRecords.find(record => record.teamId === team.id)} onToggle={toggleTeam} onOpen={() => navigate(`/teams/${team.slug}`)} />)}</div> : sourceEmpty ? <EmptyState title="İlk komanda kimlikləri üçün yer açıqdır" body="Hazırda kataloqda təsdiqlənmiş profil yoxdur. İctimai görünürlük komandanın təsdiqindən sonra açılır; əvvəlcə iştirak şərtləri ilə tanış olun." action={<Link className="button button--secondary" to={serviceCapabilities.register ? '/register' : '/regulations#rule-1'}><span>{serviceCapabilities.register ? 'Komanda yarat' : 'İştirak şərtlərinə bax'}</span><ArrowRight size={17} /></Link>} /> : <EmptyState title="Axtarışa uyğun komanda tapılmadı" body="Sorğunu dəyişin. Kataloq yalnız public görünürlüyü təsdiqlənmiş komandaları göstərir." />}</div></section></>;
}

export function OrganizationsDirectoryPage() {
  const { organizations } = usePublicPlatformData();
  const [query, setQuery] = useState(''); const [verification, setVerification] = useState('all');
  const results = useMemo(() => organizations.filter((organization) => organization.name.toLowerCase().includes(query.toLowerCase()) && (verification === 'all' || organization.verificationLevel === verification)), [organizations, query, verification]);
  const sourceEmpty = organizations.length === 0;
  return <section className="page-section organization-directory"><div className="container"><PageHeader title="Komandalar və təşkilatlar" description="AEVIC daxilində təsdiqlənmiş rəqabət kimliklərini, oyun heyətlərini və qazanılmış irsi kəşf edin." />{!sourceEmpty && <div className="discovery-toolbar"><label className="search-field"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ad ilə axtar" aria-label="Təşkilat adı ilə axtar" /></label><Select label="Oyun" defaultValue="pubg-mobile"><option value="pubg-mobile">PUBG Mobile</option></Select><Select label="Təsdiq" value={verification} onChange={(event) => setVerification(event.target.value)}><option value="all">Bütün səviyyələr</option><option value="registered">Qeydiyyatdan keçib</option><option value="approved">Təsdiqlənib</option><option value="verified">Təsdiqlənib</option><option value="legacy">Yarış irsi</option></Select></div>}{sourceEmpty ? <EmptyState title="Komandadan təşkilata" body="Hazırda ictimai təşkilat profili yoxdur. Komandalar təşkilata bağlı olmadan da müstəqil yarış kimliyi yarada bilər." action={<Link className="button button--secondary" to="/teams"><span>Komandalara bax</span><ArrowRight size={17} /></Link>} /> : results.length === 0 ? <EmptyState title="Filtrə uyğun təşkilat tapılmadı" body="Axtarış mətnini və ya təsdiq filtrini dəyişin." /> : <div className="organization-directory__results">{results.map((organization) => <Link key={organization.id} to={`/organizations/${organization.slug}`} className="organization-directory__row"><TeamLogo name={organization.name} src={organization.logoUrl} size="lg" /><div><span>{organization.shortName} · {organization.country}</span><h2>{organization.name} <VerificationCrest level={organization.verificationLevel} /></h2><p>{organization.description}</p></div><div><span><Gamepad2 size={17} />PUBG Mobile</span><strong>{organization.ownedTeams.length} aktiv komanda</strong></div><ArrowRight size={20} /></Link>)}</div>}</div></section>;
}

export function OrganizationProfilePage() {
  const { teamAchievements } = usePublicPlatformData();
  const { organizationSlug = '' } = useParams(); const [cabinetOpen, setCabinetOpen] = useState(false);
  const {data:organization,loading,error,refetch}=usePlatformQuery({key:`organization:${organizationSlug}`,scope:'public',query:()=>services.organizations.getBySlug(organizationSlug)});
  if(error)return <EmptyState title="Təşkilat yüklənmədi" body="Xidmət hazırda cavab vermir." action={<Button onClick={refetch}>Yenidən yoxla</Button>}/>;
  if (loading) return <section className="page-section"><div className="container"><LoadingSkeleton rows={5} /></div></section>;
  if (!organization) return <section className="page-section"><div className="container"><EmptyState title="Təşkilat tapılmadı" body="Bu public profil mövcud deyil və ya görünürlükdən çıxarılıb." action={<Link className="button button--secondary" to="/organizations"><span>Directory-yə qayıt</span></Link>} /></div></section>;
  const featured = teamAchievements.filter((item) => organization.featuredAchievements.includes(item.id)).map((item, index) => ({ ...item, displayOrder: index + 1 }));
  return <>
    <article className="public-profile organization-profile">
      <div className="container">
        <OrganizationBanner organization={organization}>
          <div className="profile-banner__content"><OrganizationIdentity organization={organization} /><SocialLinkList links={organization.socialLinks} ownerName={organization.name} compact /></div>
        </OrganizationBanner>
        <nav className="profile-anchor-nav" aria-label="Təşkilat profili bölmələri"><a href="#overview">İcmal</a><a href="#teams">Komandalar</a><a href="#achievements">Nailiyyətlər</a></nav>
        <section id="overview" className="organization-overview">
          <div><h2>Rəsmi təşkilat profili</h2><p>{organization.description}</p><dl><div><dt>Ölkə</dt><dd><Flag size={16} />{organization.country}</dd></div><div><dt>Qurulub</dt><dd><CalendarDays size={16} />{organization.foundedAt ? new Date(organization.foundedAt).toLocaleDateString('az-AZ', { month: 'long', year: 'numeric' }) : 'Dərc edilməyib'}</dd></div>{sanitizeOutboundUrl(organization.website) && <div><dt>Website</dt><dd><Globe2 size={16} /><a href={sanitizeOutboundUrl(organization.website)} target="_blank" rel="noopener noreferrer">Sayta keç</a></dd></div>}</dl></div>
          <aside><strong>İctimai profil statusu</strong><VerificationCrest level={organization.verificationLevel} showLabel /><p>Təsdiq səviyyəsi təşkilat kimliyinə aiddir; nişan və nailiyyətlərdən ayrıdır.</p></aside>
        </section>
        <section id="teams" className="organization-teams">
          <SectionHeading title="Oyun üzrə komandalar" description="Hazırda AEVIC-də yalnız PUBG Mobile aktiv oyun domenidir." />
          {organization.ownedTeams.map((item) => <Link key={item.id} to={organizationTeamPath(item)} className="organization-team-row"><span className="game-monogram">PM</span><div><span>PUBG Mobile</span><h3>{item.displayName}</h3><p>{item.status === 'active' ? 'Aktiv rəqabət heyəti' : item.status}</p></div><StatusBadge status="approved">Təşkilata bağlı</StatusBadge><ArrowRight size={19} /></Link>)}
        </section>
        <section id="achievements"><FeaturedBadgeCabinet achievements={featured} onViewAll={() => setCabinetOpen(true)} /></section>
      </div>
    </article>
    <BadgeCollectionDrawer open={cabinetOpen} achievements={teamAchievements} onClose={() => setCabinetOpen(false)} />
  </>;
}

export function PublicTeamProfileRoute() {
  return serviceCapabilities.publicTeamHistory ? <TeamProfilePage /> : <PublicTeamSummaryPage />;
}

function PublicTeamSummaryPage() {
  const { teamSlug } = useParams();
  const { teams } = usePublicPlatformData();
  const team = teams.find((item) => item.slug === teamSlug);
  return team ? <PublicTeamDetail team={team} /> : <section className="page-section"><div className="container"><EmptyState heading="h1" title="Komanda tapılmadı" body="Bu kimlik ictimai kataloqda yoxdur." /><Link to="/teams">Komanda kataloquna qayıt</Link></div></section>;
}

export function TeamProfilePage() {
  const { teamSlug = '' } = useParams();
  const {data:profile,loading,error}=usePlatformQuery({key:`profile:${teamSlug}`,scope:'public',query:()=>services.profiles.teamBySlug(teamSlug)});
  const failed=Boolean(error);

  useEffect(() => {
    if (!profile) return;
    const hash = window.location.hash.slice(1);
    if (['overview', 'form', 'roster', 'performance', 'matches'].includes(hash)) {
      const settleHash = () => window.requestAnimationFrame(() => {
        const root = document.documentElement;
        const previousBehavior = root.style.scrollBehavior;
        root.style.scrollBehavior = 'auto';
        document.getElementById(hash)?.scrollIntoView({ block: 'start' });
        window.requestAnimationFrame(() => { root.style.scrollBehavior = previousBehavior; });
      });
      settleHash();
      void document.fonts.ready.then(settleHash);
    }
  }, [profile]);

  if (loading) return <section className="page-section"><div className="container"><LoadingSkeleton rows={5} /></div></section>;
  if (failed) return <section className="page-section"><div className="container"><EmptyState title="Profil yüklənmədi" body="Public profil servisi hazırda cavab vermir. Bir az sonra yenidən cəhd edin." /></div></section>;
  if (!profile) return <section className="page-section"><div className="container"><EmptyState heading="h1" title="Komanda tapılmadı" body="Profil mövcud deyil və ya ictimai görünürlükdən çıxarılıb. Təsdiqlənmiş kimlikləri kataloqdan seçin." action={<Link className="button button--secondary" to="/teams">Komanda kataloqu</Link>} /></div></section>;

  return <PublicTeamDetail team={profile.team} profile={profile} />;
}
export function PublicTeamComparisonPage() {
  const { teamComparisonRecords, teams } = usePublicPlatformData();
  const [searchParams] = useSearchParams();
  const requestedLeft = searchParams.get('team');
  const requestedRight = searchParams.get('opponent');
  const leftTeam = requestedLeft ? teams.find((team) => team.slug === requestedLeft) : undefined;
  const rightTeam = requestedRight ? teams.find((team) => team.slug === requestedRight) : undefined;
  const invalidSelection = Boolean((requestedLeft && !leftTeam) || (requestedRight && !rightTeam));
  return <section className="page-section"><div className="container"><PageHeader eyebrow="Public comparison" title="Komandaları müqayisə et" description="Dərc edilmiş rəsmi nəticələri yan-yana oxuyun. Məlumat olmayan göstəricilər açıq şəkildə boş saxlanır." /><TeamComparison key={`${requestedLeft}-${requestedRight}`} records={teamComparisonRecords} initialLeftId={requestedLeft ? leftTeam?.id ?? '' : undefined} initialRightId={requestedRight ? rightTeam?.id ?? '' : undefined} invalidSelection={invalidSelection} /></div></section>;
}

export function TeamBadgeCabinetPage() {
  const { currentTeam, teamAchievements } = useTeamPlatformData();
  return <><PageHeader title="Badge Cabinet" description="Public profilinizdə görünəcək qazanılmış üç insigniyanı seçin və sırasını idarə edin." actions={<Link className="button button--secondary" to={`/teams/${currentTeam.slug}`} target="_blank"><span>Public profilə bax</span><ArrowRight size={17} /></Link>} /><BadgeCabinetEditor achievements={teamAchievements} teamId={currentTeam.id} /></>;
}

export function AdminOrganizationsPage() {
  const { organizations } = useAdminPlatformData();
  return <><PageHeader title="Təşkilatlar" description="Serverdə qeydiyyatdan keçmiş təşkilatlar və onların komanda əlaqələri." actions={<Link to="/admin/verifications" className="button button--secondary">Doğrulama sorğuları</Link>} />
    {!organizations.length ? <EmptyState title="Təşkilat yoxdur" body="Təşkilat yaradıldıqda burada görünəcək." /> : organizations.map(organization => <section key={organization.id} className="admin-organization-review"><header><TeamLogo name={organization.name} size="lg" /><div><span>{organization.shortName} · {organization.country}</span><h2><Link to={`/organizations/${organization.slug}`}>{organization.name}</Link> <VerificationCrest level={organization.verificationLevel} /></h2></div></header><dl><div><dt>Aktiv komandalar</dt><dd>{organization.ownedTeams.length}</dd></div><div><dt>Sosial linklər</dt><dd>{Object.keys(organization.socialLinks).length}</dd></div></dl>{organization.ownedTeams.map(team => <div key={team.id} className="admin-organization-review__team"><TeamLogo name={team.displayName} /><Link to={`/admin/teams/${team.teamId}`}>{team.displayName}</Link></div>)}</section>)}
  </>;
}
