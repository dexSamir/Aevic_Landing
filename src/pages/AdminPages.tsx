import { TournamentCreateForm, ResultEntryForm, TournamentOperations } from './AdminCompetitionForms';
import { StatCardStrip } from '../components/common/StatCardStrip';
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  BarChart3,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Filter,
  ListChecks,
  LockKeyhole,
  MailPlus,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Save,
  Search,
  Send,
  Settings,
  ShieldAlert,
  Trophy,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Button,
  Checkbox,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Input,
  MobileDataList,
  PageHeader,
  ProgressBar,
  SectionHeading,
  Select,
  StatusBadge,
  Tabs,
  TeamLogo,
  Textarea,
  Toast,
} from '../components/common/primitives';
import { competitionNow, serviceCapabilities, services } from '../services';
import { selectAdminOperationalTournament, selectPrimaryCompetition } from '../utils/competitionSelectors';
import { selectAdminOperations } from '../utils/adminOperations';
import { formatEventDate } from '../utils/calendar';
import { useAdminPlatformData } from '../services/PlatformDataContext';
import { tournamentById } from '../utils/routes';
import { reviewRoundResults } from '../utils/lifecycle';
import { deriveTournamentCapacity } from '../utils/tournamentCapacity';

export function AdminDashboardPage() {
  const snapshot = useAdminPlatformData();
  const { tournaments, adminMessages } = snapshot;
  const activeTournament = selectAdminOperationalTournament(tournaments, competitionNow());
  const metrics = activeTournament ? selectAdminOperations(snapshot, activeTournament) : undefined;
  return <><PageHeader eyebrow="Yarış əməliyyatları" title="İdarə paneli" description="Növbəti qərar, yoxlama növbəsi və mənbədəki yarış vəziyyəti." actions={<Link className="button button--secondary" to="/admin/tournaments"><span>Turnirlər</span></Link>} />
    {!activeTournament || !metrics ? <EmptyState title="Aktiv turnir yoxdur" body="Dərc edilmiş yarış olduqda vaxt pəncərələri və əməliyyat növbəsi görünəcək." /> : <>
    <section className="admin-command"><div className="admin-command__lead"><span>Növbəti yarış əməliyyatı</span><h2>{activeTournament.name}</h2><p>Check-in: {formatEventDate(activeTournament.checkInOpensAt, { withTime: true })} AZT</p><div><ProgressBar value={metrics.capacity.occupied} max={metrics.capacity.total} label="Dolu slotlar" /><Link to={'/admin/tournaments/' + activeTournament.id}>Slot panelini aç <ArrowRight size={16} /></Link></div></div><StatCardStrip label="Yarış əməliyyatları" items={[
      { key: 'approvals', eyebrow: 'Təsdiq gözləyir', value: metrics.approvalCounts.pending, meta: 'Komanda yoxlama növbəsi', icon: <UserCheck size={20} />, tone: 'gold', href: '/admin/teams' },
      { key: 'slots', eyebrow: 'Boş slot', value: metrics.capacity.available, meta: 'Ayrılmış slotlardan', icon: <ListChecks size={20} />, tone: 'purple', href: '/admin/tournaments/' + activeTournament.id },
      { key: 'check-ins', eyebrow: 'Buraxılmış check-in', value: metrics.missingCheckIns ?? '—', meta: metrics.missingCheckIns === undefined ? 'Mənbə əlçatan deyil' : 'Mənbədəki vəziyyət', icon: <CalendarClock size={20} />, tone: 'ink', href: '/admin/check-ins/missed' },
      { key: 'results', eyebrow: 'Nəticə gedişatı', value: metrics.resultProgress ? metrics.resultProgress.published + '/' + metrics.resultProgress.expected : '—', meta: metrics.resultProgress ? 'Dərc edilmiş raundlar' : 'Nəşr mənbəyi əlçatan deyil', icon: <BarChart3 size={20} />, tone: 'soft', href: '/admin/results' },
    ]} /></section>
    <div className="admin-dashboard-grid"><section><SectionHeading title="Yoxlama növbəsi" /><div className="action-queue"><Link to="/admin/teams"><span><UserCheck size={19} /></span><div><strong>{metrics.approvalCounts.pending} komanda təsdiqi</strong><small>Heyət və kimlik yoxlaması</small></div></Link><Link to={'/admin/tournaments/' + activeTournament.id}><span><ListChecks size={19} /></span><div><strong>Slot bölgüsü</strong><small>{metrics.capacity.occupied} dolu · {metrics.capacity.available} boş · {metrics.capacity.reserved} rezerv</small></div></Link><Link to="/admin/results"><span><BarChart3 size={19} /></span><div><strong>Nəticə yoxlaması</strong><small>Raund mənbələri və dərc vəziyyəti</small></div></Link></div></section><section><SectionHeading title="Son mesajlar" action={<Link to="/admin/messages">Mesaj mərkəzi</Link>} />{adminMessages.map((message) => <div className="recent-message" key={message.id}><MessageSquare size={18} /><div><strong>{message.title}</strong><span>{formatEventDate(message.createdAt)}</span></div></div>)}</section></div></>}
  </>;
}

export function AdminTournamentsPage() {
  const snapshot = useAdminPlatformData();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const labels: Record<string, string> = { 'registration-open': 'Qeydiyyat açıqdır', completed: 'Tamamlanıb', published: 'Dərc edilib', draft: 'Qaralama', cancelled: 'Ləğv edilib', live: 'Canlı' };
  const filtered = snapshot.tournaments.filter((item) => (status === 'all' || item.status === status) && item.name.toLocaleLowerCase('az').includes(search.toLocaleLowerCase('az')));
  return <><PageHeader eyebrow="Turnir portfeli" title="Turnirlər" description="Qaralamadan tamamlanmaya qədər status, tutum və nəticə gedişatı." actions={<Link className="button button--secondary" to="/admin/tournaments/new"><Plus size={18} /><span>Yeni turnir</span></Link>} />
    <div className="admin-toolbar"><div className="search-field"><Search size={17} /><input aria-label="Turnir axtar" placeholder="Turnir adına görə axtar" value={search} onChange={(event) => setSearch(event.target.value)} /></div><Select label="Status filtri" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Bütün statuslar</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></div>
    <div className="admin-tournament-table">{filtered.map((tournament) => { const metrics = selectAdminOperations(snapshot, tournament); return <article key={tournament.id}><div className="admin-tournament-table__identity"><span>{formatEventDate(tournament.startsAt)}</span><div><strong>{tournament.name}</strong><small>{tournament.days} gün · {tournament.roundsPerDay * tournament.days} raund</small></div></div><StatusBadge status={tournament.status === 'registration-open' ? 'open' : tournament.status === 'completed' ? 'completed' : 'draft'}>{labels[tournament.status] ?? tournament.status}</StatusBadge><div><span>Tutum</span><strong>{metrics.capacity.total ? metrics.capacity.occupied + '/' + metrics.capacity.total : 'Mənbə yoxdur'}</strong></div><div><span>Mükafat</span><strong>{tournament.prizePool} {tournament.prizeCurrency}</strong></div><Link to={'/admin/tournaments/' + tournament.id}>İdarə et <ArrowRight size={16} /></Link></article>; })}</div>
    {!filtered.length && <EmptyState title="Uyğun turnir yoxdur" body="Axtarış və status filtrini dəyişin." />}
  </>;
}

export function AdminTournamentNewPage() { return <TournamentCreateForm />; }

export function AdminTournamentDetailPage() {
  const snapshot = useAdminPlatformData();
  const { tournaments, teams } = snapshot;
  const { tournamentId } = useParams();
  const tournament = tournamentById(tournaments, tournamentId);
  const [selected, setSelected] = useState<number[]>([]);
  const [query, setQuery] = useState('');
  const toggle = (slot: number) => setSelected((values) => values.includes(slot) ? values.filter((value) => value !== slot) : [...values, slot]);
  if (!tournament) return <><PageHeader eyebrow="Slot və check-in əməliyyatları" title="Turnir tapılmadı" /><EmptyState title="Yanlış turnir ünvanı" body="İdarəetmə paneli başqa turnirin məlumatını göstərmədi. Siyahıdan etibarlı turnir seçin." action={<Link className="button button--secondary" to="/admin/tournaments"><span>Turnir siyahısına qayıt</span></Link>} /></>;
  const { slots: tournamentSlots, capacity } = selectAdminOperations(snapshot, tournament);
  const visibleSlots = tournamentSlots.filter((slot) => `${slot.number} ${teams.find((team) => team.id === slot.teamId)?.name ?? ''}`.toLocaleLowerCase('az').includes(query.toLocaleLowerCase('az')));
  return <><PageHeader eyebrow="Slot və check-in əməliyyatları" title={tournament.name} description={`${capacity.occupied}/${capacity.total} doludur · check-in ${formatEventDate(tournament.checkInOpensAt, { withTime: true })} AZT`} actions={<><Link className="button button--secondary" to={`/admin/tournaments/${tournament.id}/lifecycle`}><span>Həyat dövrü</span></Link><Button disabled variant="secondary" icon={<ClipboardCheck size={17} />}>Check-in düzəlişi</Button><Button disabled icon={<Plus size={17} />}>Komanda təyin et</Button></>} /><section className="slot-admin-summary"><div><span>Dolu</span><strong>{capacity.occupied}</strong></div><div><span>Boş</span><strong>{capacity.available}</strong></div><div><span>Rezerv</span><strong>{capacity.reserved}</strong></div><div><span>Cəmi</span><strong>{capacity.total}</strong></div><ProgressBar value={capacity.occupied + capacity.reserved} max={capacity.total} /></section><div className="admin-toolbar"><div className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Komanda və slot axtar" placeholder="Komanda və ya slot axtar" /></div><Button disabled variant="ghost" icon={<Filter size={17} />}>Filtr</Button>{selected.length > 0 && <span className="selection-count">{selected.length} seçilib</span>}</div><div className="slot-management-grid">{visibleSlots.map((slot) => <article className={`slot-management-item slot-management-item--${slot.state} ${selected.includes(slot.number) ? 'selected' : ''}`} key={slot.number}><Checkbox aria-label={`Slot ${slot.number} seç`} checked={selected.includes(slot.number)} onChange={() => toggle(slot.number)} label={<span className="sr-only">Slotu seç</span>} /><span className="slot-management-item__number">{String(slot.number).padStart(2, '0')}</span><div><strong>{slot.state === 'occupied' ? (teams.find((team) => team.id === slot.teamId)?.name ?? 'Kimliyi mənbədə yoxdur') : slot.state === 'reserved' ? 'Rezerv slot' : 'Boş'}</strong><small>{slot.state === 'occupied' ? 'Check-in vəziyyəti ayrıca mənbə tələb edir' : slot.state === 'reserved' ? 'rezerv' : 'boş'}</small></div>{slot.state === 'occupied' ? <StatusBadge status="warning">Check-in məlum deyil</StatusBadge> : <StatusBadge status={slot.state === 'reserved' ? 'locked' : 'approved'}>{slot.state === 'reserved' ? 'Rezerv' : 'Boş'}</StatusBadge>}<Button disabled variant="ghost" aria-label={`Slot ${slot.number} əməliyyatları`}><MoreHorizontal size={17} /></Button></article>)}</div><TournamentOperations tournamentId={tournament.id}/></>;
}

export function AdminTeamsPage() {
  const { teams } = useAdminPlatformData();
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [toast, setToast] = useState('');
  const filtered = teams.filter((team) => (status === 'all' || team.approvalStatus === status) && `${team.name} ${team.captain.firstName} ${team.captain.lastName} ${team.captain.email} ${team.captain.phone}`.toLocaleLowerCase('az').includes(query.toLocaleLowerCase('az')));
  const toggle = (id: string) => setSelected((values) => values.includes(id) ? values.filter((value) => value !== id) : [...values, id]);
  const rows = filtered.map((team) => [<Checkbox key={team.id} aria-label={`${team.name} seç`} checked={selected.includes(team.id)} onChange={() => toggle(team.id)} label={<span className="sr-only">Seç</span>} />, <span className="team-cell"><TeamLogo name={team.name} size="sm" /><strong>{team.name}</strong></span>, `${team.captain.firstName} ${team.captain.lastName}`, team.captain.phone, team.roster.length, <StatusBadge status={team.approvalStatus} />, <Link className="button button--ghost" key="action" to={`/admin/teams/${team.id}`}><span>Detallar</span></Link>]);
  return <><PageHeader eyebrow="Təsdiq əməliyyatları" title="Komandalar" description="Təqdim edilmiş heyətlərin təsdiqi, rəddi və bloklanma vəziyyəti." />{toast && <Toast title={toast} body={`${selected.length} team mock state-də yeniləndi.`} onClose={() => setToast('')} />}<div className="admin-toolbar"><div className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Komanda axtar" placeholder="Komanda, kapitan, e-poçt və ya telefon" /></div><Tabs active={status} onChange={setStatus} items={[{ id: 'all', label: 'Hamısı', count: teams.length }, { id: 'pending', label: 'Gözləyir', count: teams.filter((team) => team.approvalStatus === 'pending').length }, { id: 'approved', label: 'Təsdiqlənib', count: teams.filter((team) => team.approvalStatus === 'approved').length }, { id: 'rejected', label: 'Rədd edilib', count: teams.filter((team) => team.approvalStatus === 'rejected').length }, { id: 'banned', label: 'Bloklanıb', count: teams.filter((team) => team.approvalStatus === 'banned').length }]} /></div>{selected.length > 0 && <div className="bulk-bar"><strong>{selected.length} komanda seçilib</strong><Button variant="secondary" icon={<UserCheck size={17} />} disabled={!serviceCapabilities.bulkApproval}>Təsdiqlə</Button><Button variant="danger" icon={<XCircle size={17} />} disabled={!serviceCapabilities.bulkApproval}>Rədd et</Button></div>}<DataTable headers={['', "Komanda", "Kapitan", 'WhatsApp', "Heyət", "Status", '']} rows={rows} /><MobileDataList items={filtered.map((team) => ({ title: <span className="team-cell"><TeamLogo name={team.name} size="sm" />{team.name}</span>, meta: `${team.captain.firstName} · ${team.roster.length} oyunçu`, value: <StatusBadge status={team.approvalStatus} />, details: <div className="mobile-row-actions"><Link className="button button--ghost" to={`/admin/teams/${team.id}`}><span>Yoxla</span></Link><Checkbox label="Seç" checked={selected.includes(team.id)} onChange={() => toggle(team.id)} /></div> }))} /></>;
}

export function AdminResultsPage() { return <ResultEntryForm />; }

export function AdminMessagesPage() {
  const { adminMessages } = useAdminPlatformData();
  const [messages, setMessages] = useState(adminMessages);
  const [title, setTitle] = useState(''); const [body, setBody] = useState('');
  const [pending, setPending] = useState(false); const [notice, setNotice] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (pending || !title.trim() || !body.trim()) return;
    setPending(true); setNotice('');
    try {
      await services.admin.sendMessage({ title: title.trim(), body: body.trim(), severity: 'info', audience: 'all' });
      const snapshot = await services.snapshots.admin();
      setMessages(snapshot.adminMessages); setTitle(''); setBody('');
      setNotice('Elan komanda mesajlarına əlavə edildi.');
    } catch { setNotice('Elan göndərilmədi. Yenidən yoxlayın.'); }
    finally { setPending(false); }
  };
  return <><PageHeader eyebrow="Komanda elanları" title="Mesaj mərkəzi" description="Bütün komandalar üçün tətbiqdaxili elan." />{notice && <p role="status">{notice}</p>}<div className="message-admin-layout"><form onSubmit={submit}><SectionHeading title="Yeni elan" /><Input label="Elan başlığı" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} required /><Textarea label="Elan mətni" value={body} onChange={(event) => setBody(event.target.value)} rows={6} maxLength={4000} required /><Button type="submit" loading={pending} disabled={!title.trim() || !body.trim()} icon={<Send size={17} />}>Elanı göndər</Button></form><section><SectionHeading title="Göndərilmiş elanlar" />{messages.map((message) => <article className="sent-message" key={message.id}><time>{formatEventDate(message.createdAt, { withTime: true })}</time><h3>{message.title}</h3><p>{message.body}</p></article>)}</section></div></>;
}

export function AdminBlacklistPage() {
  const { blacklist } = useAdminPlatformData();
  const [query, setQuery] = useState('');
  const [banState, setBanState] = useState('all');
  const visible = blacklist.filter((entry) => (banState === 'all' || entry.active === (banState === 'active')) && `${entry.teamName} ${entry.reason}`.toLocaleLowerCase('az').includes(query.toLocaleLowerCase('az')));
  const [banOpen, setBanOpen] = useState(false);
  const [toast, setToast] = useState(false);
  return <><PageHeader eyebrow="İştirak məhdudiyyətləri" title="Qara siyahı" description="Aktiv, müddəti bitmiş və daimi məhdudiyyətlərin səbəbləri." actions={<Button variant="danger" icon={<Ban size={17} />} disabled>Komandanı blokla</Button>} />{toast && <Toast title="Məhdudiyyət yaradıldı" body="Əməliyyat yalnız nümayiş rejimində tamamlandı." onClose={() => setToast(false)} />}<div className="admin-toolbar"><div className="search-field"><Search size={17} /><input aria-label="Qara siyahıda axtar" placeholder="Komanda və ya səbəb" value={query} onChange={(event) => setQuery(event.target.value)} /></div><Select label="Məhdudiyyət statusu" value={banState} onChange={(event) => setBanState(event.target.value)}><option value="all">Bütün statuslar</option><option value="active">Aktiv</option><option value="expired">Müddəti bitib</option></Select></div><div className="blacklist-list">{visible.map((entry) => <article key={entry.id}><div className="blacklist-list__icon"><ShieldAlert size={20} /></div><div><div><strong>{entry.teamName}</strong><StatusBadge status={entry.active ? 'banned' : 'completed'}>{entry.active ? "Aktiv məhdudiyyət" : "Müddəti bitib"}</StatusBadge></div><p>{entry.reason}</p><span>{entry.permanent ? "Daimi" : `Expired ${entry.expiresAt}`}</span></div><Button variant="ghost" disabled>Bloku ləğv et</Button></article>)}</div>{!visible.length && <EmptyState title="Uyğun qeyd tapılmadı" body="Axtarışı və status filtrini dəyişin." />}<ConfirmDialog open={banOpen} title="Komandanı bloklayırsınız?" body="Məhdudiyyət turnir qeydiyyatını bloklayacaq. Serverdə səbəb, müddət, admin kimliyi və audit qeydi tələb olunur." confirmLabel="Bloku təsdiqlə" onClose={() => setBanOpen(false)} onConfirm={async () => { setBanOpen(false); }} /></>;
}

export function AdminSettingsPage() {
  const [saved, setSaved] = useState(false);
  return <><PageHeader eyebrow="Platforma qaydaları" title="Admin parametrləri" description="Standart seçimlər və xidmətlərin hazırlığı; məxfi açarlar brauzerdə göstərilmir." />{saved && <Toast title="Parametrlər saxlanıldı" body="Yalnız nümayiş vəziyyəti yeniləndi." onClose={() => setSaved(false)} />}<form className="admin-settings" onSubmit={(event) => { event.preventDefault(); setSaved(true); }}><section><SectionHeading title="Standart yarış seçimləri" /><Input label="Standart maksimum slot sayı" type="number" defaultValue={24} /><Input label="Standart otaq açılma aralığı" type="number" defaultValue={8} hint="Raunddan əvvəl dəqiqə ilə" /><Input label="Standart check-in müddəti" type="number" defaultValue={60} hint="Dəqiqə" /><Checkbox label="Heyət dəyişiklikləri admin təsdiqi tələb edir" defaultChecked /><Checkbox label="Dərc edilmiş nəticənin düzəlişi üçün səbəb tələb olunur" defaultChecked /></section><section><SectionHeading title="Çatdırılma xidmətləri" /><div className="provider-status"><MailPlus size={20} /><div><strong>E-poçt xidməti</strong><span>Qoşulmayıb</span></div><StatusBadge status="warning">Server xidməti tələb olunur</StatusBadge></div><div className="provider-status"><MessageSquare size={20} /><div><strong>Push bildiriş xidməti</strong><span>Brauzer bildiriş infrastrukturu hazırdır</span></div><StatusBadge status="warning">Qoşulmayıb</StatusBadge></div><div className="provider-status"><LockKeyhole size={20} /><div><strong>Otağa giriş icazəsi</strong><span>Qorunan giriş müqaviləsi müəyyən edilib</span></div><StatusBadge status="warning">Server xidməti tələb olunur</StatusBadge></div></section><section><SectionHeading title="Audit tələbləri" /><Checkbox label="Komanda təsdiqi qeydləri" defaultChecked disabled /><Checkbox label="Heyət dəyişikliyi qeydləri" defaultChecked disabled /><Checkbox label="Nəticənin dərci və düzəliş qeydləri" defaultChecked disabled /><Checkbox label="Bloklama və blokun ləğvi qeydləri" defaultChecked disabled /><Checkbox label="Otaq məlumatlarına giriş qeydləri" defaultChecked disabled /></section><footer><Button type="submit" disabled={!serviceCapabilities.platformSettings} icon={<Settings size={17} />}>Parametrləri saxla</Button></footer></form></>;
}
