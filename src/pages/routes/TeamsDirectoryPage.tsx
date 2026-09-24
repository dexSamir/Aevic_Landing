import { ArrowRight,GitCompareArrows,Search,X } from 'lucide-react';
import { useEffect,useMemo,useState } from 'react';
import { Link,useNavigate } from 'react-router-dom';
import { featuredTournamentArtwork } from '../../assets/tournaments';
import { MediaBackdrop } from '../../components/common/MediaBackdrop';
import { Button,EmptyState,Select } from '../../components/common/primitives';
import { DirectoryTeamCard } from '../../components/profile/DirectoryTeamCard';
import { competitionNow,serviceCapabilities,services } from '../../services';
import { usePublicPlatformData } from '../../services/PlatformDataContext';
import '../../styles/public-pages.css';
import { resolveTournamentTemporalPhase } from '../../utils/tournamentTime';
import { emptyDirectoryTournaments } from './ProfilePagesShared';
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

  const visible = useMemo(() => teamsList.filter((team) => team.name.toLocaleLowerCase('az').includes(query.trim().toLocaleLowerCase('az')) && (status === 'all' || (team.sourceStatus ?? team.verificationLevel) === status)).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name, 'az') : sort === 'roster' ? b.rosterSize - a.rosterSize : 0), [query, teamsList, status, sort]);
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
  return <><section className="teams-directory"><header className="directory-hero"><MediaBackdrop {...featuredTournamentArtwork} className="directory-hero__media" focalDesktop="15% center" focalMobile="24% center" sizes="100vw" priority /><div className="container"><span>// &nbsp; PUBLIC TEAMS</span><h1>AEVIC<br /><em>Komandaları</em></h1><p>Mövcud komanda qeydiyyatları, heyətlər və qeydiyyat statusları.<br />PUBG Mobile icmasında ən yaxşı komandaları kəşf et.</p><small>AD AETERNAM VICTORIAM.</small></div></header><div className="container">{!sourceEmpty && <div className={`teams-directory__discovery${compareMode ? ' is-comparing' : ''}`}><label className="search-field teams-directory__search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Komanda adı ilə axtar..." aria-label="Komanda adı ilə axtar" /></label><Select label="Status" value={status} onChange={event => setStatus(event.target.value)}><option value="all">Hamısı</option><option value="pending">Gözləmədə</option><option value="approved">Təsdiqlənmiş</option><option value="rejected">Rədd edilmiş</option></Select><Select label="Sırala" value={sort} onChange={event => setSort(event.target.value)}><option value="default">Standart</option><option value="name">Ad üzrə</option><option value="roster">Heyət sayı</option></Select><div className="teams-directory__compare-control">{!compareMode ? <Button size="lg" variant="secondary" icon={<GitCompareArrows size={17} />} disabled={!teamComparisonRecords.length} title={!teamComparisonRecords.length ? "Müqayisə üçün yarış nəticələri əlçatan deyil" : undefined} onClick={() => setCompareMode(true)}>Müqayisə et</Button> : <><span className="teams-directory__compare-progress" role="status">{selectedIds.length} / 2 seçilib<span className="sr-only">{feedback && ` · ${feedback}`}</span></span><Button className="directory-compare-cancel" size="lg" variant="secondary" aria-label="Ləğv et" title="Müqayisəni ləğv et" icon={<X size={17} />} onClick={cancelCompare}><span className="sr-only">Ləğv et</span></Button>{selectedTeams.length === 2 && <Button size="lg" onClick={() => navigate(`/teams/compare?${new URLSearchParams({ team: selectedTeams[0].slug, opponent: selectedTeams[1].slug })}`)}>Komandaları müqayisə et</Button>}</>}</div><div className="teams-directory__count" aria-live="polite"><span>GÖRÜNƏN KOMANDA PROFİLİ</span><strong>{String(visible.length).padStart(2, '0')}</strong></div></div>}{visible.length ? <div className="team-directory-grid" role="list" aria-label={`${visible.length} public komanda`}>{visible.map((team, index) => <DirectoryTeamCard key={team.id} team={team} ordinal={index + 1} compareMode={compareMode} selected={compareMode && selectedIds.includes(team.id)} ownTeam={ownTeamId === team.id} registration={registrations[team.id]} record={teamComparisonRecords.find(record => record.teamId === team.id)} onToggle={toggleTeam} onOpen={() => navigate(`/teams/${team.slug}`)} />)}</div> : sourceEmpty ? <EmptyState title="İlk komanda kimlikləri üçün yer açıqdır" body="Hazırda kataloqda təsdiqlənmiş profil yoxdur. İctimai görünürlük komandanın təsdiqindən sonra açılır; əvvəlcə iştirak şərtləri ilə tanış olun." action={<Link className="button button--secondary" to={serviceCapabilities.register ? '/register' : '/regulations#rule-1'}><span>{serviceCapabilities.register ? 'Komanda yarat' : 'İştirak şərtlərinə bax'}</span><ArrowRight size={17} /></Link>} /> : <EmptyState title="Axtarışa uyğun komanda tapılmadı" body="Sorğunu dəyişin. Kataloq mövcud komanda qeydiyyatlarını göstərir." />}</div></section></>;
}
