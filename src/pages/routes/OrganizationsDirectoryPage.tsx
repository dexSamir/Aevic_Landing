import { ArrowRight,Gamepad2,Search } from 'lucide-react';
import { useMemo,useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState,PageHeader,Select,TeamLogo } from '../../components/common/primitives';
import { VerificationCrest } from '../../components/profile/ProfileElements';
import { usePublicPlatformData } from '../../services/PlatformDataContext';
import '../../styles/public-pages.css';

export function OrganizationsDirectoryPage() {
  const { organizations } = usePublicPlatformData();
  const [query, setQuery] = useState(''); const [verification, setVerification] = useState('all');
  const results = useMemo(() => organizations.filter((organization) => organization.name.toLowerCase().includes(query.toLowerCase()) && (verification === 'all' || organization.verificationLevel === verification)), [organizations, query, verification]);
  const sourceEmpty = organizations.length === 0;
  return <section className="page-section organization-directory"><div className="container"><PageHeader title="Komandalar və təşkilatlar" description="AEVIC daxilində təsdiqlənmiş rəqabət kimliklərini, oyun heyətlərini və qazanılmış irsi kəşf edin." />{!sourceEmpty && <div className="discovery-toolbar"><label className="search-field"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ad ilə axtar" aria-label="Təşkilat adı ilə axtar" /></label><Select label="Oyun" defaultValue="pubg-mobile"><option value="pubg-mobile">PUBG Mobile</option></Select><Select label="Təsdiq" value={verification} onChange={(event) => setVerification(event.target.value)}><option value="all">Bütün səviyyələr</option><option value="registered">Qeydiyyatdan keçib</option><option value="approved">Təsdiqlənib</option><option value="verified">Təsdiqlənib</option><option value="legacy">Yarış irsi</option></Select></div>}{sourceEmpty ? <EmptyState title="Komandadan təşkilata" body="Hazırda ictimai təşkilat profili yoxdur. Komandalar təşkilata bağlı olmadan da müstəqil yarış kimliyi yarada bilər." action={<Link className="button button--secondary" to="/teams"><span>Komandalara bax</span><ArrowRight size={17} /></Link>} /> : results.length === 0 ? <EmptyState title="Filtrə uyğun təşkilat tapılmadı" body="Axtarış mətnini və ya təsdiq filtrini dəyişin." /> : <div className="organization-directory__results">{results.map((organization) => <Link key={organization.id} to={`/organizations/${organization.slug}`} className="organization-directory__row"><TeamLogo name={organization.name} src={organization.logoUrl} size="lg" /><div><span>{organization.shortName} · {organization.country}</span><h2>{organization.name} <VerificationCrest level={organization.verificationLevel} /></h2><p>{organization.description}</p></div><div><span><Gamepad2 size={17} />PUBG Mobile</span><strong>{organization.ownedTeams.length} aktiv komanda</strong></div><ArrowRight size={20} /></Link>)}</div>}</div></section>;
}
