import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { TeamWorkspacePlaceholder } from './TeamWorkspaceFrame';
import { BrandEmblem } from '../components/brand/BrandMark';
import { RouteSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState, Button } from '../components/common/primitives';
import { serviceCapabilities, services } from '../services';

export function ProtectedRoute({ area, children }: { area: 'team' | 'admin' | 'account'; children: ReactNode }) {
  const [checking, setChecking] = useState<boolean>(true);
  const [allowed, setAllowed] = useState(false);
  const [deniedPath, setDeniedPath] = useState(!serviceCapabilities.publicSession ? (area === 'admin' ? '/admin/login' : '/login') : '');
  const [unavailable, setUnavailable] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [identity,setIdentity] = useState('');
  useEffect(()=>{const refresh=()=>setAttempt(n=>n+1);window.addEventListener('focus',refresh);window.addEventListener('aevic:session-change',refresh);return()=>{window.removeEventListener('focus',refresh);window.removeEventListener('aevic:session-change',refresh);};},[]);
  useEffect(() => {
    let active = true;
    if (!serviceCapabilities.publicSession) {
      setAllowed(false);
      setDeniedPath(area === 'admin' ? '/admin/login' : '/login');
      setChecking(false);
      return;
    }
    setUnavailable(false);
    services.auth.getSession().then((session) => {
      if (!active) return;
      const accepted = area === 'admin' ? session?.role === 'admin' : area === 'account' ? Boolean(session) : Boolean(session && ['captain', 'team', 'admin'].includes(session.role));
      setIdentity(session?.user.id??'');setAllowed(accepted);
      if (!accepted) setDeniedPath(session ? '/forbidden' : area === 'admin' ? '/admin/login' : '/login');
    }).catch(() => { if(active) { setAllowed(false); setUnavailable(true); } }).finally(() => { if(active)setChecking(false); });
    return () => { active = false; };
  }, [area, attempt]);
  if (checking && area === 'team') return <TeamWorkspacePlaceholder phase="session" />;
  if (checking) return <main className="route-loading"><div className="route-loading__identity"><BrandEmblem decorative={false} /><span>AEVIC secure access</span></div><RouteSkeleton path={window.location.pathname}/></main>;
  if (unavailable && area === 'team') return <TeamWorkspacePlaceholder><EmptyState heading="h1" title="Bağlantını yoxlayın" body="Hesab sessiyasını yoxlamaq mümkün olmadı. Bir az sonra yenidən cəhd edin." action={<Button onClick={() => setAttempt(value => value + 1)}>Yenidən yoxla</Button>} /></TeamWorkspacePlaceholder>;
  if (unavailable) return <main className="route-loading"><h1>Bağlantını yoxlayın</h1><p role="status">Hesab sessiyasını yoxlamaq mümkün olmadı. Bir az sonra yenidən cəhd edin.</p><Button onClick={() => setAttempt(value => value + 1)}>Yenidən yoxla</Button></main>;
  if (!allowed) return <Navigate to={deniedPath || (area === 'admin' ? '/admin/login' : '/login')} replace />;
  return <div key={identity} data-protected-area={area}>{children}</div>;
}
