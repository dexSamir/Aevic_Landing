import { sanitizeOutboundUrl } from '../utils/outboundUrl';
import { ArrowRight, CalendarDays, Flag, Gamepad2, Globe2, History, Image, Link2, Search, Share2, ShieldCheck, Sparkles, Swords } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { BadgeCabinetEditor, BadgeCollectionDrawer, FeaturedBadgeCabinet } from '../components/team/BadgeCabinet';
import { OrganizationBanner, OrganizationBannerUploader, OrganizationIdentity, SocialLinkList, TeamOrganizationLink, VerificationCrest } from '../components/profile/ProfileElements';
import { Button, EmptyState, Input, LoadingSkeleton, PageHeader, SectionHeading, Select, StatusBadge, TeamLogo, TeamLogoTile, Toast } from '../components/common/primitives';
import { ComparisonLink, FollowTeamEntry, PerformanceTrend, PublicRoster, RecentMatchList, ShareProfileAction, UpcomingMatchCard } from '../components/profile/PublicTeamExperience';
import { MapSpecialization, TeamForm } from '../components/competition/CompetitionIntelligence';
import { CareerSummary, TeamComparison } from '../components/team/TeamExperience';
import { MediaBackdrop } from '../components/common/MediaBackdrop';
import { serviceCapabilities, services } from '../services';
import { useAdminPlatformData, usePublicPlatformData, useTeamPlatformData } from '../services/PlatformDataContext';
import type { Organization, PublicTeamProfile } from '../types/domain';
import { yearPeriod } from '../utils/wrapped';
import { organizationTeamPath } from '../utils/routes';
import { deriveTeamSpecialization, TEAM_SPECIALIZATION_MINIMUM_MATCHES } from '../utils/competitionAnalytics';

export function TeamsDirectoryPage() {
  const { teams: teamsList } = usePublicPlatformData(); const [query, setQuery] = useState('');
  const visible = useMemo(() => teamsList.filter((team) => team.name.toLocaleLowerCase('az').includes(query.trim().toLocaleLowerCase('az'))), [query, teamsList]);
  const [activeId, setActiveId] = useState(visible[0]?.id ?? '');
  useEffect(() => { if (!visible.some((team) => team.id === activeId)) setActiveId(visible[0]?.id ?? ''); }, [activeId, visible]);
  const active = visible.find((team) => team.id === activeId) ?? visible[0];
  const sourceEmpty = teamsList.length === 0;
  return <section className="page-section teams-directory"><div className="container"><PageHeader eyebrow="Public teams" title="AEVIC komandaları" description="Təsdiqlənmiş komanda kimlikləri, heyətlər və dərc edilmiş yarış tarixçəsi." />{!sourceEmpty && <div className="teams-directory__discovery"><label className="search-field teams-directory__search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Komanda adı ilə axtar" aria-label="Komanda adı ilə axtar" /></label><div className="teams-directory__count" aria-live="polite"><span>PUBLIC INDEX</span><strong>{String(visible.length).padStart(2, '0')}</strong><small>görünən komanda profili</small></div></div>}{visible.length && active ? <div className="team-directory-system"><div className="team-directory-logo-wall" role="list" aria-label={`${visible.length} public komanda`}>{visible.map((team, index) => <div role="listitem" key={team.id}><TeamLogoTile id={team.id} name={team.name} tag={team.tag} logoUrl={team.logoUrl} profileHref={`/teams/${team.slug}`} selected={team.id === active.id} onSelect={setActiveId} ordinal={index + 1} meta={`${team.rosterSize} oyunçu`} /></div>)}</div><aside className="team-directory-active" aria-live="polite"><TeamLogo name={active.name} src={active.logoUrl} size="xl" /><div><span>{active.tag || 'PUBG MOBILE'} · {active.country || 'AEVIC'}</span><h2>{active.name}</h2><p>{active.rosterSize} oyunçulu public rəqabət kimliyi.</p><Link className="button button--primary" to={`/teams/${active.slug}`}><span>Public profili aç</span><ArrowRight size={17} /></Link></div></aside></div> : sourceEmpty ? <EmptyState title="İlk komanda kimlikləri üçün yer açıqdır" body="Hazırda kataloqda təsdiqlənmiş profil yoxdur. İctimai görünürlük komandanın təsdiqindən sonra açılır; əvvəlcə iştirak şərtləri ilə tanış olun." action={<Link className="button button--secondary" to={serviceCapabilities.register ? '/register' : '/regulations#rule-1'}><span>{serviceCapabilities.register ? 'Komanda yarat' : 'İştirak şərtlərinə bax'}</span><ArrowRight size={17} /></Link>} /> : <EmptyState title="Axtarışa uyğun komanda tapılmadı" body="Sorğunu dəyişin. Kataloq yalnız public görünürlüyü təsdiqlənmiş komandaları göstərir." />}</div></section>;
}

export function OrganizationsDirectoryPage() {
  const { organizations } = usePublicPlatformData();
  const [query, setQuery] = useState(''); const [verification, setVerification] = useState('all');
  const results = useMemo(() => organizations.filter((organization) => organization.name.toLowerCase().includes(query.toLowerCase()) && (verification === 'all' || organization.verificationLevel === verification)), [query, verification]);
  const sourceEmpty = organizations.length === 0;
  return <section className="page-section organization-directory"><div className="container"><PageHeader title="Komandalar və təşkilatlar" description="AEVIC daxilində təsdiqlənmiş rəqabət kimliklərini, oyun heyətlərini və qazanılmış irsi kəşf edin." />{!sourceEmpty && <div className="discovery-toolbar"><label className="search-field"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ad ilə axtar" aria-label="Təşkilat adı ilə axtar" /></label><Select label="Oyun" defaultValue="pubg-mobile"><option value="pubg-mobile">PUBG Mobile</option></Select><Select label="Təsdiq" value={verification} onChange={(event) => setVerification(event.target.value)}><option value="all">Bütün səviyyələr</option><option value="registered">Qeydiyyatdan keçib</option><option value="approved">Təsdiqlənib</option><option value="verified">Təsdiqlənib</option><option value="legacy">Yarış irsi</option></Select></div>}{sourceEmpty ? <EmptyState title="Komandadan təşkilata" body="Hazırda ictimai təşkilat profili yoxdur. Komandalar təşkilata bağlı olmadan da müstəqil yarış kimliyi yarada bilər." action={<Link className="button button--secondary" to="/teams"><span>Komandalara bax</span><ArrowRight size={17} /></Link>} /> : results.length === 0 ? <EmptyState title="Filtrə uyğun təşkilat tapılmadı" body="Axtarış mətnini və ya təsdiq filtrini dəyişin." /> : <div className="organization-directory__results">{results.map((organization) => <Link key={organization.id} to={`/organizations/${organization.slug}`} className="organization-directory__row"><TeamLogo name={organization.name} src={organization.logoUrl} size="lg" /><div><span>{organization.shortName} · {organization.country}</span><h2>{organization.name} <VerificationCrest level={organization.verificationLevel} /></h2><p>{organization.description}</p></div><div><span><Gamepad2 size={17} />PUBG Mobile</span><strong>{organization.ownedTeams.length} aktiv komanda</strong></div><ArrowRight size={20} /></Link>)}</div>}</div></section>;
}

export function OrganizationProfilePage() {
  const { teamAchievements } = usePublicPlatformData();
  const { organizationSlug = '' } = useParams(); const [organization, setOrganization] = useState<Organization>(); const [loading, setLoading] = useState(true); const [cabinetOpen, setCabinetOpen] = useState(false);
  useEffect(() => { services.organizations.getBySlug(organizationSlug).then(setOrganization).finally(() => setLoading(false)); }, [organizationSlug]);
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
          <div><h2>Rəsmi təşkilat profili</h2><p>{organization.description}</p><dl><div><dt>Ölkə</dt><dd><Flag size={16} />{organization.country}</dd></div><div><dt>Qurulub</dt><dd><CalendarDays size={16} />{new Date(organization.foundedAt).toLocaleDateString('az-AZ', { month: 'long', year: 'numeric' })}</dd></div>{sanitizeOutboundUrl(organization.website) && <div><dt>Website</dt><dd><Globe2 size={16} /><a href={sanitizeOutboundUrl(organization.website)} target="_blank" rel="noopener noreferrer">Sayta keç</a></dd></div>}</dl></div>
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
  return <section className="page-section"><div className="container">{team ? <><PageHeader eyebrow="Təsdiqlənmiş komanda kimliyi" title={team.name} description="İctimai komanda kataloqunda dərc edilmiş məlumatlar." /><TeamLogo name={team.name} src={team.logoUrl} size="xl" /><p>{team.rosterSize} oyunçulu PUBG Mobile heyəti.</p><p>Ətraflı profil və yarış tarixçəsi hələ bu buraxılışda əlçatan deyil.</p></> : <EmptyState heading="h1" title="Komanda tapılmadı" body="Bu kimlik ictimai kataloqda yoxdur." />}<Link className="button button--secondary" to="/teams">Komanda kataloquna qayıt</Link></div></section>;
}

export function TeamProfilePage() {
  const { teamSlug = '' } = useParams();
  const [profile, setProfile] = useState<PublicTeamProfile>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [cabinetOpen, setCabinetOpen] = useState(false);
  const [wrappedYear, setWrappedYear] = useState<number>();

  useEffect(() => {
    setLoading(true);
    setFailed(false);
    services.profiles.teamBySlug(teamSlug).then(setProfile).catch(() => setFailed(true)).finally(() => setLoading(false));
  }, [teamSlug]);

  useEffect(() => {
    let current = true;
    setWrappedYear(undefined);
    if (!profile) return () => { current = false; };
    const years = [...new Set(profile.recentMatches.map((match) => new Date(match.playedAt).getFullYear()))].sort((a, b) => b - a);
    void Promise.all(years.map(async (candidate) => ({ candidate, summary: await services.wrapped.forTeam(teamSlug, yearPeriod(candidate)) })))
      .then((items) => { if (current) setWrappedYear(items.find((item) => item.summary?.available)?.candidate); })
      .catch(() => { if (current) setWrappedYear(undefined); });
    return () => { current = false; };
  }, [profile, teamSlug]);

  useEffect(() => {
    if (!profile) return;
    const hash = window.location.hash.slice(1);
    if (['overview', 'roster', 'performance', 'matches', 'achievements'].includes(hash)) {
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

  const { team, organization, achievements } = profile;
  const featured = profile.featuredAchievementIds.map((id, index) => {
    const achievement = achievements.find((item) => item.id === id);
    return achievement ? { ...achievement, displayOrder: index + 1 } : undefined;
  }).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const metric = (key: string) => profile.career?.metrics.find((item) => item.key === key)?.value;
  const specialization = profile.specialization ?? deriveTeamSpecialization(profile.recentMatches);
  return <>
    <article className="public-profile team-public-profile">
      <header className={`team-profile-hero ${team.bannerUrl ? 'team-profile-hero--image' : 'team-profile-hero--fallback'}`}>
        {team.bannerUrl && <MediaBackdrop src={team.bannerUrl} alt={team.bannerAlt ?? `${team.name} banneri`} focalDesktop="50% 46%" focalMobile="50% 50%" priority />}
        <div className="container team-profile-hero__stage">
          <div className="team-profile-hero__content">
            <div className="team-profile-identity"><TeamLogo name={team.name} src={team.logoUrl} size="lg" /><div><span>{team.tag || 'PUBG MOBILE'} · PUBG Mobile</span><h1>{team.name} {team.verificationLevel && <VerificationCrest level={team.verificationLevel} />}</h1><TeamOrganizationLink team={team} organization={organization} />{team.description && <p>{team.description}</p>}</div></div>
            <div className="team-profile-hero__actions"><SocialLinkList links={team.socialLinks} ownerName={team.name} compact /><div className="team-profile-primary-actions"><FollowTeamEntry teamId={team.id} /><ComparisonLink teamSlug={teamSlug} /><ShareProfileAction teamName={team.name} /></div></div>
          </div>
          <div className="team-profile-hero__next"><UpcomingMatchCard match={profile.upcomingMatch} /></div>
        </div>
      </header>

      <div className="container team-profile-body">
        <section id="overview" aria-labelledby="overview-title" className="team-profile-panel team-profile-panel--overview">
          <div className="team-profile-form-band"><TeamForm form={profile.form} /></div>
          <div className="team-profile-overview">
            <div><span className="profile-kicker">Public team profile</span><h2 id="overview-title">Komanda kimliyi</h2><p>{team.description || 'Komanda hələ public təsvir əlavə etməyib.'}</p><div className="team-profile-meta"><span><Flag size={17} />{team.country || 'Ölkə qeyd edilməyib'}</span><span><History size={17} />{new Date(team.foundedAt ?? team.registeredAt).getFullYear()} tarixindən</span><span><ShieldCheck size={17} />Təsdiqlənib</span></div></div>
            <aside className={specialization ? 'has-specialization' : 'is-forming'}><span>Ən güclü göstərici</span>{specialization ? <><strong>{specialization.label}</strong><small>{specialization.evidence} · {specialization.sampleSize} matç nümunəsi</small></> : <><strong>Profil formalaşır</strong><small>{profile.recentMatches.length} / {TEAM_SPECIALIZATION_MINIMUM_MATCHES} dərc edilmiş matç</small></>}</aside>
          </div>
          {profile.career ? <CareerSummary data={profile.career} comparisonHref={`/teams/compare?team=${teamSlug}`} /> : <EmptyState title="Karyera ilk rəsmi nəticədən başlayır" body="Bu komanda üçün karyera xülasəsi hələ yoxdur. Yalnız dərc edilmiş matçlar karyera göstəricilərinə daxil edilir." action={<Link className="text-link" to="/regulations#rule-5">Xal sistemi ilə tanış ol</Link>} />}
          <aside className="team-card-discovery">
            <div className="team-card-discovery__preview" aria-hidden="true">
              <span>AEVIC // TEAM IDENTITY</span>
              <div><TeamLogo name={team.name} src={team.logoUrl} /><strong>{team.name}</strong><small>{organization?.shortName || team.tag || 'PUBG MOBILE'}</small></div>
              <dl>{metric('wwcd') ? <div><dt>WWCD</dt><dd>{metric('wwcd')}</dd></div> : null}{metric('championships') ? <div><dt>Çempionluq</dt><dd>{metric('championships')}</dd></div> : null}{metric('matches') ? <div><dt>Matç</dt><dd>{metric('matches')}</dd></div> : null}</dl>
            </div>
            <div><span>KOMANDA KARTI</span><h2>Komandanı AEVIC-dən kənarda da tanıt.</h2><p>Rəsmi komanda kimliyini sosial formatlarda hazırla və paylaş.</p><Link className="button button--secondary" to={`/teams/${teamSlug}/share-card`}><Share2 size={17} /><span>Komanda kartını yarat</span><ArrowRight size={17} /></Link></div>
          </aside>
        </section>

        <section id="roster" aria-labelledby="roster-title" className="team-profile-panel team-profile-panel--roster team-roster-public"><SectionHeading title="Aktiv heyət" description="Kapitan, əsas heyət və əvəzedici rolları" /><span id="roster-title" className="sr-only">Aktiv heyət</span><PublicRoster roster={team.roster} /></section>

        <section id="performance" aria-labelledby="performance-title" className="team-profile-panel team-profile-panel--performance">
          <span id="performance-title" className="sr-only">Komanda performansı</span>
          {wrappedYear && <aside className="wrapped-entry"><div className="wrapped-entry__preview" aria-hidden="true"><span>AEVIC</span><b>{wrappedYear}</b><strong>{team.name}</strong><i>{metric('matches') ?? profile.recentMatches.length} MATÇ · {metric('wwcd') ?? profile.recentMatches.filter((match) => match.wwcd).length} WWCD</i><em><span /><span /><span /></em></div><div className="wrapped-entry__copy"><span>YOUR {wrappedYear} IS READY</span><h2>Bu mövsümün hekayəsini yenidən yaşa.</h2><p>Komanda kimliyi və yalnız dərc edilmiş nəticələrlə qurulan 9:16 AEVIC story.</p><strong>{metric('matches') ?? profile.recentMatches.length} MATÇ <i>·</i> {metric('wwcd') ?? profile.recentMatches.filter((match) => match.wwcd).length} WWCD</strong><Link className="button button--primary" to={`/teams/${teamSlug}/wrapped/${wrappedYear}`}><Sparkles size={18} /><span>Wrapped-a bax</span><ArrowRight size={17} /></Link></div></aside>}
          <MapSpecialization summary={profile.mapSpecialization} />
        </section>

        <section id="matches" aria-labelledby="matches-title" className="team-profile-panel team-profile-panel--matches team-matches-public"><SectionHeading title="Son matçlar" description="Yalnız dərc edilmiş raund nəticələri" action={<Link to="/matches">Match center</Link>} /><span id="matches-title" className="sr-only">Son matçlar</span><div className="team-matches-public__grid"><RecentMatchList matches={profile.recentMatches} /><PerformanceTrend matches={profile.recentMatches} /></div></section>

        <section id="achievements" aria-labelledby="achievements-title" className="team-profile-panel team-profile-panel--achievements"><span id="achievements-title" className="sr-only">Nailiyyətlər</span>{featured.length ? <FeaturedBadgeCabinet achievements={featured} onViewAll={() => setCabinetOpen(true)} /> : <EmptyState icon={<Swords size={27} />} title="Seçilmiş nailiyyət yoxdur" body="Qazanılmış və public üçün seçilmiş nişanlar burada görünəcək." />}</section>
      </div>
    </article>
    <BadgeCollectionDrawer open={cabinetOpen} achievements={achievements} onClose={() => setCabinetOpen(false)} />
  </>;
}
export function PublicTeamComparisonPage() {
  const { teamComparisonRecords, teams } = usePublicPlatformData();
  const [searchParams] = useSearchParams();
  const requestedLeft = searchParams.get('team');
  const requestedRight = searchParams.get('opponent');
  const leftTeam = requestedLeft ? teams.find((team) => team.slug === requestedLeft) : undefined;
  const rightTeam = requestedRight ? teams.find((team) => team.slug === requestedRight) : undefined;
  const invalidSelection = Boolean((requestedLeft && !leftTeam) || (requestedRight && !rightTeam));
  return <section className="page-section"><div className="container"><PageHeader eyebrow="Public comparison" title="Komandaları müqayisə et" description="Dərc edilmiş demo nəticələri yan-yana oxuyun. Məlumat olmayan göstəricilər açıq şəkildə boş saxlanır." /><TeamComparison key={`${requestedLeft}-${requestedRight}`} records={teamComparisonRecords} initialLeftId={requestedLeft ? leftTeam?.id ?? '' : undefined} initialRightId={requestedRight ? rightTeam?.id ?? '' : undefined} invalidSelection={invalidSelection} /></div></section>;
}

export function TeamBadgeCabinetPage() {
  const { currentTeam, teamAchievements } = useTeamPlatformData();
  return <><PageHeader title="Badge Cabinet" description="Public profilinizdə görünəcək qazanılmış üç insigniyanı seçin və sırasını idarə edin." actions={<Link className="button button--secondary" to={`/teams/${currentTeam.slug}`} target="_blank"><span>Public profilə bax</span><ArrowRight size={17} /></Link>} /><BadgeCabinetEditor achievements={teamAchievements} teamId={currentTeam.id} /></>;
}

export function AdminOrganizationsPage() {
  const { currentTeam, organizations } = useAdminPlatformData(); const [notice, setNotice] = useState(false); const activeOrganization = organizations[0];
  if (!activeOrganization) return <><PageHeader title="Təşkilatlar" description="Təşkilat kimliyi və komanda əlaqələri." /><EmptyState title="Təşkilat yoxdur" body="Təşkilat qeydi yaradıldıqda yoxlama səthi burada görünəcək." /></>;
  return <><PageHeader title="Təşkilatlar" description="Public identity, komanda əlaqəsi, media metadata və featured badge konfiqurasiyası üçün restrained review surface." />{notice && <Toast title="Demo link state updated" body="Production əməliyyatı ownership permission və audit log tələb edir." onClose={() => setNotice(false)} />}<section className="admin-organization-review"><header><TeamLogo name={activeOrganization.name} size="lg" /><div><span>{activeOrganization.shortName} · {activeOrganization.country}</span><h2>{activeOrganization.name} <VerificationCrest level={activeOrganization.verificationLevel} /></h2></div><StatusBadge status="approved">Public</StatusBadge></header><dl><div><dt>Aktiv teams</dt><dd>{activeOrganization.ownedTeams.length}</dd></div><div><dt>Social links</dt><dd>{Object.keys(activeOrganization.socialLinks).length}</dd></div><div><dt>Featured badges</dt><dd>{activeOrganization.featuredAchievements.length} / 3</dd></div><div><dt>Media review</dt><dd>Banner + fallback ready</dd></div></dl><div className="admin-organization-review__team"><TeamLogo name={currentTeam.name} /><div><strong>{currentTeam.name}</strong><span>PUBG Mobile · organization-owned</span></div><Button variant="ghost" onClick={() => setNotice(true)} icon={<Link2 size={17} />}>Linki review et</Button></div><OrganizationBannerUploader organization={activeOrganization} /><aside><Image size={19} /><p>Logo/banner moderation, ownership transfer, invitation acceptance and audit history require backend roles and persistent review records.</p></aside></section></>;
}
