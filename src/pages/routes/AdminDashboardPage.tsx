import {
ArrowRight,
BarChart3,
CalendarClock,
ListChecks,
MessageSquare,
UserCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
EmptyState,
PageHeader,
ProgressBar,
SectionHeading
} from '../../components/common/primitives';
import { StatCardStrip } from '../../components/common/StatCardStrip';
import { competitionNow } from '../../services';
import { useAdminPlatformData } from '../../services/PlatformDataContext';
import { selectAdminOperations } from '../../utils/adminOperations';
import { formatEventDate } from '../../utils/calendar';
import { selectAdminOperationalTournament } from '../../utils/competitionSelectors';

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
