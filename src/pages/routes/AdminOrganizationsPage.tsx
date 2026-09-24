import { Link } from 'react-router-dom';
import { EmptyState,PageHeader,TeamLogo } from '../../components/common/primitives';
import { VerificationCrest } from '../../components/profile/ProfileElements';
import { useAdminPlatformData } from '../../services/PlatformDataContext';
import '../../styles/public-pages.css';

export function AdminOrganizationsPage() {
  const { organizations } = useAdminPlatformData();
  return <><PageHeader title="Təşkilatlar" description="Serverdə qeydiyyatdan keçmiş təşkilatlar və onların komanda əlaqələri." actions={<Link to="/admin/verifications" className="button button--secondary">Doğrulama sorğuları</Link>} />
    {!organizations.length ? <EmptyState title="Təşkilat yoxdur" body="Təşkilat yaradıldıqda burada görünəcək." /> : organizations.map(organization => <section key={organization.id} className="admin-organization-review"><header><TeamLogo name={organization.name} size="lg" /><div><span>{organization.shortName} · {organization.country}</span><h2><Link to={`/organizations/${organization.slug}`}>{organization.name}</Link> <VerificationCrest level={organization.verificationLevel} /></h2></div></header><dl><div><dt>Aktiv komandalar</dt><dd>{organization.ownedTeams.length}</dd></div><div><dt>Sosial linklər</dt><dd>{Object.keys(organization.socialLinks).length}</dd></div></dl>{organization.ownedTeams.map(team => <div key={team.id} className="admin-organization-review__team"><TeamLogo name={team.displayName} /><Link to={`/admin/teams/${team.teamId}`}>{team.displayName}</Link></div>)}</section>)}
  </>;
}
