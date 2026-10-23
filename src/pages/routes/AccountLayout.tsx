import { useProtectedSession } from '../../layouts/ProtectedRoute';
import { services } from '../../services';
import { usePlatformQuery } from '../../services/queryCache';
import { MobileBottomNav } from '../../layouts/MobileBottomNav';
import { SkipLink } from '../../components/common/SkipLink';
import { NavLink } from "react-router-dom";
import "../../app/workspaceStyles";
import { BrandMark } from "../../components/brand/BrandMark";
import { RouteTransitionOutlet } from "../../components/common/Motion";
import { RouteSeo } from "../../components/common/Seo";
import { accountLinks } from './AccountPagesShared';
export function AccountLayout() {
  const session = useProtectedSession();
  const team = usePlatformQuery({ key: `account:team:${session?.user.id}`, query: () => services.teams.current(), enabled: Boolean(session && ['captain', 'team'].includes(session.role)), retry: 0 });
  return (
    <div className="account-shell">
      <RouteSeo />
      <SkipLink target="account-content" />
      <aside>
        <BrandMark />
        <div>
          <span>Hesab</span>
          <strong>Şəxsi giriş və təhlükəsizlik</strong>
        </div>
        <nav aria-label="Hesab bölmələri">
          {accountLinks.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}>
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <NavLink to="/account/legacy-claim">Əvvəlki komandanı bağla</NavLink>
        <NavLink className="account-shell__team-link" to="/team">
          Komanda panelinə qayıt
        </NavLink>
      </aside>
      <main id="account-content">
        <RouteTransitionOutlet family="account" />
      </main>
      <MobileBottomNav session={session} team={team.data} />
    </div>
  );
}
