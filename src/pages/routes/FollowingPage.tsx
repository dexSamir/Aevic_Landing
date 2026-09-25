import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/public-discovery.css';
import { Button, EmptyState, LoadingSkeleton, PageHeader, Toast } from '../../components/common/primitives';
import { services } from '../../services';
import { invalidateQuery, usePlatformQuery } from '../../services/queryCache';

export function FollowingPage() {
  const [busy, setBusy] = useState('');
  const [mutationError, setMutationError] = useState(false);
  const { data, error, refetch } = usePlatformQuery({ key: 'following:inbox', query: async () => {
    const session = await services.auth.getSession();
    if (!session) return { state: 'signed-out' as const, items: [] };
    if (session.role === 'admin') return { state: 'admin' as const, items: [] };
    return { state: 'ready' as const, items: await services.follows!.list() };
  } });
  const unfollow = async (entityId: string) => {
    setBusy(entityId); setMutationError(false);
    try { await services.follows!.mutate({ entityType: 'TEAM', entityId, following: false }); invalidateQuery('following:'); refetch(); }
    catch { setMutationError(true); }
    finally { setBusy(''); }
  };
  return <section className="page-section completion-page"><div className="container">
    <PageHeader eyebrow="Yarış yenilikləri" title="İzlədiklərim" description="İzlədiyiniz komandaların profillərinə buradan keçin və izləmə siyahınızı idarə edin." />
    {mutationError && <Toast tone="error" title="İzləmə dəyişdirilmədi" body="Yenidən cəhd edin." />}
    {error ? <EmptyState title="Məlumat yüklənmədi" body="Bağlantını yoxlayın və yenidən cəhd edin." action={<Button onClick={() => refetch()}>Yenidən yoxla</Button>} />
      : !data ? <LoadingSkeleton variant="cards" rows={4} />
      : data.state === 'signed-out' ? <EmptyState title="İzlədiyiniz komandaları görmək üçün daxil olun" body="İzləmə siyahısı hesabınıza bağlıdır." action={<Link className="button button--primary" to="/login">Daxil ol</Link>} />
      : data.state === 'admin' ? <EmptyState title="Şəxsi hesabınızla daxil olun" body="Komanda izləmə siyahısı şəxsi hesabınızda saxlanılır." action={<Link className="button button--secondary" to="/teams">Komandaları kəşf et</Link>} />
      : data.items.length ? <div className="entity-ledger">{data.items.map(item => <article key={`${item.entityType}-${item.entityId}`}>
        <ShieldCheck size={18} /><span><Link to={`/teams/${item.team?.slug ?? item.entityId}`}><strong>{item.team?.name ?? 'Komanda profili'}</strong></Link><small>{item.team?.tag}</small></span>
        <Button variant="secondary" disabled={Boolean(busy)} loading={busy === item.entityId} onClick={() => void unfollow(item.entityId)}>İzləməni dayandır</Button>
      </article>)}</div>
      : <EmptyState title="İzlənən profil yoxdur" body="İzləməyə başladığınız komandalar burada görünəcək." action={<Link className="button button--secondary" to="/teams">Komandaları kəşf et</Link>} />}
  </div></section>;
}
