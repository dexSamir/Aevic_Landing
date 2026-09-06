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
    <section className="admin-command"><div className="admin-command__lead"><span>Növbəti yarış əməliyyatı</span><h2>{activeTournament.name}</h2><p>Check-in: {formatEventDate(activeTournament.checkInOpensAt, { withTime: true })} AZT</p><div><ProgressBar value={metrics.capacity.occupied} max={metrics.capacity.total} label="Dolu slotlar" /><Link to={'/admin/tournaments/' + activeTournament.id}>Slot panelini aç <ArrowRight size={16} /></Link></div></div><div className="admin-command__stats"><div><span>Təsdiq gözləyir</span><strong>{metrics.approvalCounts.pending}</strong><small>Komanda yoxlama növbəsi</small></div><div><span>Boş slot</span><strong>{metrics.capacity.available}</strong><small>Ayrılmış slotlardan</small></div><div><span>Buraxılmış check-in</span><strong>{metrics.missingCheckIns ?? '—'}</strong><small>{metrics.missingCheckIns === undefined ? 'Mənbə əlçatan deyil' : 'Mənbədəki vəziyyət'}</small></div><div><span>Nəticə gedişatı</span><strong>{metrics.resultProgress ? metrics.resultProgress.published + '/' + metrics.resultProgress.expected : '—'}</strong><small>{metrics.resultProgress ? 'Dərc edilmiş raundlar' : 'Nəşr mənbəyi əlçatan deyil'}</small></div></div></section>
    <div className="admin-dashboard-grid"><section><SectionHeading title="Yoxlama növbəsi" /><div className="action-queue"><Link to="/admin/teams"><span><UserCheck size={19} /></span><div><strong>{metrics.approvalCounts.pending} komanda təsdiqi</strong><small>Heyət və kimlik yoxlaması</small></div></Link><Link to={'/admin/tournaments/' + activeTournament.id}><span><ListChecks size={19} /></span><div><strong>Slot bölgüsü</strong><small>{metrics.capacity.occupied} dolu · {metrics.capacity.available} boş · {metrics.capacity.reserved} rezerv</small></div></Link><Link to="/admin/results"><span><BarChart3 size={19} /></span><div><strong>Nəticə yoxlaması</strong><small>Raund mənbələri və dərc vəziyyəti</small></div></Link></div></section><section><SectionHeading title="Son mesajlar" action={<Link to="/admin/messages">Mesaj mərkəzi</Link>} />{adminMessages.map((message) => <div className="recent-message" key={message.id}><MessageSquare size={18} /><div><strong>{message.title}</strong><span>{formatEventDate(message.createdAt)}</span></div></div>)}</section></div></>}
  </>;
}

export function AdminTournamentsPage() {
  const snapshot = useAdminPlatformData();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const labels: Record<string, string> = { 'registration-open': 'Qeydiyyat açıqdır', completed: 'Tamamlanıb', published: 'Dərc edilib', draft: 'Qaralama', cancelled: 'Ləğv edilib', live: 'Canlı' };
  const filtered = snapshot.tournaments.filter((item) => (status === 'all' || item.status === status) && item.name.toLocaleLowerCase('az').includes(search.toLocaleLowerCase('az')));
  return <><PageHeader eyebrow="Turnir portfeli" title="Turnirlər" description="Qaralamadan tamamlanmaya qədər status, tutum və nəticə gedişatı." actions={<Link className="button button--secondary" to="/admin/tournaments/new"><Plus size={18} /><span>Turnir forması önbaxışı</span></Link>} />
    <div className="admin-toolbar"><div className="search-field"><Search size={17} /><input aria-label="Turnir axtar" placeholder="Turnir adına görə axtar" value={search} onChange={(event) => setSearch(event.target.value)} /></div><Select label="Status filtri" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Bütün statuslar</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></div>
    <div className="admin-tournament-table">{filtered.map((tournament) => { const metrics = selectAdminOperations(snapshot, tournament); return <article key={tournament.id}><div className="admin-tournament-table__identity"><span>{formatEventDate(tournament.startsAt)}</span><div><strong>{tournament.name}</strong><small>{tournament.days} gün · {tournament.roundsPerDay * tournament.days} raund</small></div></div><StatusBadge status={tournament.status === 'registration-open' ? 'open' : tournament.status === 'completed' ? 'completed' : 'draft'}>{labels[tournament.status] ?? tournament.status}</StatusBadge><div><span>Tutum</span><strong>{metrics.capacity.total ? metrics.capacity.occupied + '/' + metrics.capacity.total : 'Mənbə yoxdur'}</strong></div><div><span>Mükafat</span><strong>{tournament.prizePool} {tournament.prizeCurrency}</strong></div><Link to={'/admin/tournaments/' + tournament.id}>İdarə et <ArrowRight size={16} /></Link></article>; })}</div>
    {!filtered.length && <EmptyState title="Uyğun turnir yoxdur" body="Axtarış və status filtrini dəyişin." />}
  </>;
}

export function AdminTournamentNewPage() {
  const [step, setStep] = useState(1);
  const [saved, setSaved] = useState(false);
  const sections = ['Əsas məlumat', 'Tarixlər', "Format və xallar", "Yoxla"];
  return <><PageHeader eyebrow="Turnir konfiqurasiyası" title="Yeni turnir" description="Tarixləri, tutumu, formatı və dərc yoxlamasını ayrı bölmələrdə nəzərdən keçirin." actions={<Button variant="ghost" icon={<Save size={17} />} disabled={!serviceCapabilities.tournamentCreation}>Qaralama saxla</Button>} />{saved && <Toast title="Qaralama saxlanıldı" body="Yalnız nümayiş vəziyyətidir; serverdə saxlanılmayıb." onClose={() => setSaved(false)} />}<div className="admin-wizard"><aside><ProgressBar value={step} max={4} label={`Step ${step} / 4`} /><nav>{sections.map((section, index) => <button className={step === index + 1 ? 'active' : step > index + 1 ? 'done' : ''} onClick={() => setStep(index + 1)} key={section}><span>{step > index + 1 ? <Check size={15} /> : index + 1}</span>{section}</button>)}</nav><div><AlertTriangle size={18} /><p>Dərc üçün serverdə icazə yoxlaması və audit qeydi tələb olunur.</p></div></aside><form className="admin-wizard__form" onSubmit={(event) => { event.preventDefault(); if (step < 4) setStep(step + 1); else return; }}>
      {step === 1 && <section><SectionHeading title="Turnir kimliyi" description="İctimai səhifə və daxili əməliyyatlar eyni turnir mənbəyindən istifadə edir." /><Input label="Turnir adı" placeholder="AEVIC Legacy Cup — Season Two" required /><Textarea label="Təsvir" placeholder="Format, iştirakçılar və turnirin məqsədi" required /><div className="form-grid"><Input label="Mükafat fondu" type="number" placeholder="2400" /><Select label="Valyuta" defaultValue="AZN"><option>AZN</option><option>USD</option><option>EUR</option></Select></div><div className="form-grid"><Input label="Maksimum komanda sayı" type="number" defaultValue={24} /><Select label="İlkin status" defaultValue="draft"><option value="draft">Qaralama</option><option value="published">Dərc edilib</option><option value="registration-open">Qeydiyyat açıqdır</option></Select></div></section>}
      {step === 2 && <section><SectionHeading title="Tarixlər və açılma vaxtları" description="Başlanğıc, qeydiyyat, check-in və otağın açılma vaxtlarını birlikdə yoxlayın." /><div className="form-grid"><Input label="Başlanğıc tarixi" type="date" /><Input label="Başlanğıc saatı" type="time" defaultValue="19:00" /></div><div className="form-grid"><Input label="Bitmə tarixi" type="date" /><Input label="Qeydiyyatın açılması" type="datetime-local" /></div><Input label="Qeydiyyatın son tarixi" type="datetime-local" /><div className="form-grid"><Input label="Check-in açılır" type="datetime-local" /><Input label="Check-in bağlanır" type="datetime-local" /></div><Input label="Otaq məlumatlarının açılma aralığı" type="number" defaultValue={8} hint="Hər raunddan əvvəl dəqiqə ilə; tövsiyə edilən aralıq 5–10." /></section>}
      {step === 3 && <section><SectionHeading title="Yarış formatı" description="Xəritə ardıcıllığı və xal düsturu turnir konfiqurasiyasının hissəsidir." /><div className="form-grid"><Input label="Turnir günləri" type="number" defaultValue={1} /><Input label="Gündəlik raund sayı" type="number" defaultValue={4} /></div><div className="map-builder"><span>Sabit xəritə ardıcıllığı</span>{['Erangel', 'Miramar', 'Rondo', 'Erangel'].map((map, index) => <div key={`${map}-${index}`}><span>R{index + 1}</span><Select label={`Round ${index + 1}`} defaultValue={map}><option>Erangel</option><option>Miramar</option><option>Rondo</option></Select></div>)}</div><div className="form-grid"><Input label="WWCD bonusu" type="number" defaultValue={10} /><Input label="Hər məhv etmə üçün xal" type="number" defaultValue={1} /></div><div className="form-grid"><Input label="Standart cərimə" type="number" defaultValue={0} /><Input label="Maksimum yer sayı" type="number" defaultValue={16} /></div><div className="point-formula-preview"><span>Yerləşmə xalları</span><div>{['1st · 15', '2nd · 12', '3rd · 10', '4th · 8', '5th · 6', '6th · 4', '7th · 3', '8th · 2', '9–12 · 1', '13–16 · 0'].map((item) => <strong key={item}>{item}</strong>)}</div></div><Textarea label="Bərabərlik qaydaları" defaultValue="Ən çox WWCD → Ən çox məhv etmə xalı → Son raundda ən yüksək yer" /><Textarea label="Qaydalar və reqlament" placeholder="Hər sətirdə bir qayda" /></section>}
      {step === 4 && <section><SectionHeading title="Dərc öncəsi yoxlama" description="İctimai dərcdən əvvəl bütün konfiqurasiyanı yoxlayın." /><p role="status">Bu konfiqurasiya önbaxışıdır. Qaralama saxlama və turnir yaratma xidməti qoşulmayıb; nəşr edilən turnir yoxdur.</p><Checkbox label="Tarixlərin uyğunluğu yoxlanılıb" required /><Checkbox label="Xal düsturu və bərabərlik qaydaları yoxlanılıb" required /><Checkbox label="Qaydalar dərc üçün təsdiqlənib" required /></section>}
      <footer><Button type="button" variant="ghost" disabled={step === 1} onClick={() => setStep(Math.max(1, step - 1))}>Geri</Button><Button type="submit" disabled={step === 4 && !serviceCapabilities.tournamentCreation}>{step === 4 ? 'Turniri yarat' : 'Davam et'}</Button></footer>
    </form></div></>;
}

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
  return <><PageHeader eyebrow="Slot və check-in əməliyyatları" title={tournament.name} description={`${capacity.occupied}/${capacity.total} doludur · check-in ${formatEventDate(tournament.checkInOpensAt, { withTime: true })} AZT`} actions={<><Link className="button button--secondary" to={`/admin/tournaments/${tournament.id}/lifecycle`}><span>Həyat dövrü</span></Link><Button disabled variant="secondary" icon={<ClipboardCheck size={17} />}>Check-in düzəlişi</Button><Button disabled icon={<Plus size={17} />}>Komanda təyin et</Button></>} /><section className="slot-admin-summary"><div><span>Dolu</span><strong>{capacity.occupied}</strong></div><div><span>Boş</span><strong>{capacity.available}</strong></div><div><span>Rezerv</span><strong>{capacity.reserved}</strong></div><div><span>Cəmi</span><strong>{capacity.total}</strong></div><ProgressBar value={capacity.occupied + capacity.reserved} max={capacity.total} /></section><div className="admin-toolbar"><div className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Komanda və slot axtar" placeholder="Komanda və ya slot axtar" /></div><Button disabled variant="ghost" icon={<Filter size={17} />}>Filtr</Button>{selected.length > 0 && <span className="selection-count">{selected.length} seçilib</span>}</div><div className="slot-management-grid">{visibleSlots.map((slot) => <article className={`slot-management-item slot-management-item--${slot.state} ${selected.includes(slot.number) ? 'selected' : ''}`} key={slot.number}><Checkbox aria-label={`Slot ${slot.number} seç`} checked={selected.includes(slot.number)} onChange={() => toggle(slot.number)} label={<span className="sr-only">Slotu seç</span>} /><span className="slot-management-item__number">{String(slot.number).padStart(2, '0')}</span><div><strong>{slot.state === 'occupied' ? (teams.find((team) => team.id === slot.teamId)?.name ?? 'Kimliyi mənbədə yoxdur') : slot.state === 'reserved' ? 'Rezerv slot' : 'Boş'}</strong><small>{slot.state === 'occupied' ? 'Check-in vəziyyəti ayrıca mənbə tələb edir' : slot.state === 'reserved' ? 'rezerv' : 'boş'}</small></div>{slot.state === 'occupied' ? <StatusBadge status="warning">Check-in məlum deyil</StatusBadge> : <StatusBadge status={slot.state === 'reserved' ? 'locked' : 'approved'}>{slot.state === 'reserved' ? 'Rezerv' : 'Boş'}</StatusBadge>}<Button disabled variant="ghost" aria-label={`Slot ${slot.number} əməliyyatları`}><MoreHorizontal size={17} /></Button></article>)}</div></>;
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

export function AdminResultsPage() {
  const snapshot = useAdminPlatformData();
  const [selectedId, setSelectedId] = useState('');
  const tournament = snapshot.tournaments.find((item) => item.id === selectedId) ?? selectPrimaryCompetition(snapshot.tournaments, competitionNow());
  const rounds = (snapshot.matchSchedule ?? []).filter((item) => item.tournamentId === tournament?.id).sort((a, b) => a.round - b.round);
  return <><PageHeader eyebrow="Nəticə əməliyyatları" title="Nəticə girişi" description="Nəticə yalnız uyğun raund, komanda və dərc mənbəyi ilə işlənir." />
    <Select label="Turnir" value={tournament?.id ?? ''} onChange={(event) => setSelectedId(event.target.value)}><option value="" disabled>Turnir seçin</option>{snapshot.tournaments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
    {rounds.length > 0 && <div className="request-ledger">{rounds.map((round) => <Link key={round.id} to={'/admin/tournaments/' + round.tournamentId}><span>Raund {round.round}</span><strong>{round.map}</strong><time>{formatEventDate(round.startsAt, { withTime: true })}</time></Link>)}</div>}
    <EmptyState title="Nəticə nəşri hələ əlçatan deyil" body="Davamlı raund nəticəsi, nəşr və düzəliş xidməti qoşulmayıb. Avtomatik xal və komanda nəticəsi yaradılmır." action={tournament ? <Link className="button button--secondary" to={'/admin/tournaments/' + tournament.id}><span>Turnir əməliyyatlarına bax</span></Link> : undefined} />
  </>;
}

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
      setNotice('Elan nümunə qutusuna əlavə edildi. Email və push göndərilmir.');
    } catch { setNotice('Elan göndərilmədi. Yenidən yoxlayın.'); }
    finally { setPending(false); }
  };
  return <><PageHeader eyebrow="Komanda elanları" title="Mesaj mərkəzi" description="Nümunə adapterdə bütün komandalar üçün tətbiqdaxili elan. Planlı, email və push göndərişi əlçatan deyil." />{notice && <p role="status">{notice}</p>}<div className="message-admin-layout"><form onSubmit={submit}><SectionHeading title="Yeni elan" /><Input label="Elan başlığı" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} required /><Textarea label="Elan mətni" value={body} onChange={(event) => setBody(event.target.value)} rows={6} maxLength={4000} required /><Button type="submit" loading={pending} disabled={!serviceCapabilities.mockPreview || !title.trim() || !body.trim()} icon={<Send size={17} />}>Elanı göndər</Button></form><section><SectionHeading title="Göndərilmiş elanlar" />{messages.map((message) => <article className="sent-message" key={message.id}><time>{formatEventDate(message.createdAt, { withTime: true })}</time><h3>{message.title}</h3><p>{message.body}</p></article>)}</section></div></>;
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
