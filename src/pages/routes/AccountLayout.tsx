import { NavLink } from "react-router-dom";
import "../../app/workspaceStyles";
import { BrandMark } from "../../components/brand/BrandMark";
import { RouteTransitionOutlet } from "../../components/common/Motion";
import { RouteSeo } from "../../components/common/Seo";
import { accountLinks } from './AccountPagesShared';
export function AccountLayout() {
  return (
    <div className="account-shell">
      <RouteSeo />
      <a className="skip-link" href="#account-content">
        Əsas məzmuna keç
      </a>
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
    </div>
  );
}
