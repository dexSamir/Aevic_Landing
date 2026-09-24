import { ArrowRight,CircleHelp,LifeBuoy,Search } from 'lucide-react';
import { useMemo,useState } from 'react';
import { Link } from 'react-router-dom';
import '../../app/workspaceStyles';
import { EmptyState,PageHeader,SectionHeading } from '../../components/common/primitives';
import { serviceCapabilities } from '../../services';
import '../support-pages.css';
import { faqs } from './SupportPagesShared';
export function SupportCenterPage() {
  const [query, setQuery] = useState(''); const visible = useMemo(() => faqs.filter((item) => `${item[1]} ${item[2]}`.toLocaleLowerCase('az').includes(query.toLocaleLowerCase('az'))), [query]);
  return <section className="support-center page-section"><div className="container"><PageHeader eyebrow="Aydın və praktik kömək" title="Dəstək mərkəzi" description="İctimai buraxılışda mövcud xidmətlər və məhdudiyyətlər haqqında qısa cavablar." /><div className="support-search"><Search size={20} /><input aria-label="Dəstək mövzularında axtar" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Check-in, roster, nəticə…" /></div><div className="support-layout"><section><SectionHeading title="Tez-tez verilən suallar" /><div className="faq-list">{visible.map(([id, question, answer]) => <details key={id}><summary>{question}</summary><p>{answer}</p></details>)}</div>{!visible.length && <EmptyState icon={<CircleHelp size={25} />} title="Uyğun cavab tapılmadı" body="Axtarışı sadələşdirin və ya əlaqə məlumatlarına baxın." />}</section><aside><LifeBuoy size={27} /><h2>Hələ də kömək lazımdır?</h2><p>{serviceCapabilities.publicSession ? 'Hesabınıza daxil olaraq sorğu yaradın və statusu izləyin.' : 'Hesab əsaslı dəstək sorğuları hələ əlçatan deyil. Mövcud əlaqə məlumatlarına baxın.'}</p>{serviceCapabilities.publicSession ? <><Link className="button button--primary" to="/account/support/tickets/new"><span>Ticket yarat</span><ArrowRight size={17} /></Link><Link to="/account/support/tickets">Mənim sorğularım</Link></> : <Link className="button button--secondary" to="/contact">Əlaqə məlumatları</Link>}</aside></div></div></section>;
}
