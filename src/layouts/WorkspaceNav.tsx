import './workspace-nav.css';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type SideNavLink = { to: string; label: string; icon: LucideIcon; group?: string };

export function SidebarNav({ links, onNavigate, unread = 0, label = 'Məhsul naviqasiyası' }: { links: SideNavLink[]; onNavigate?: () => void; unread?: number; label?: string }) {
  const { pathname } = useLocation();
  const active = links.filter(({ to }) => pathname === to || pathname.startsWith(to + '/')).sort((a, b) => b.to.length - a.to.length)[0]?.to;
  const activeGroup = links.find((link) => link.to === active)?.group;
  const groups: { name?: string; items: SideNavLink[] }[] = [];
  links.forEach((link) => {
    const last = groups[groups.length - 1];
    if (last && last.name === link.group) last.items.push(link);
    else groups.push({ name: link.group, items: [link] });
  });
  const [openOverride, setOpenOverride] = useState<Record<string, boolean>>({});
  return <nav className="side-nav" aria-label={label}>
    {groups.map((section, sectionIndex) => {
      const key = section.name ?? `group-${sectionIndex}`;
      const defaultOpen = sectionIndex === 0 || section.name === activeGroup;
      const isOpen = openOverride[key] ?? defaultOpen;
      return <div className="side-nav__section" key={key}>
        {section.name && <button type="button" className="side-nav__group" aria-expanded={isOpen} onClick={() => setOpenOverride((current) => ({ ...current, [key]: !isOpen }))}>
          <small>{section.name}</small>
          <ChevronDown size={14} className={isOpen ? 'side-nav__group-chevron is-open' : 'side-nav__group-chevron'} aria-hidden="true" />
        </button>}
        {isOpen && <div className="side-nav__group-items">
          {section.items.map(({ to, label: linkLabel, icon: Icon }) => <Link key={to} to={to} className={active === to ? 'active' : undefined} aria-current={active === to ? 'page' : undefined} onClick={onNavigate}><Icon size={19} /><span>{linkLabel}</span>{linkLabel === 'Bildirişlər' && unread > 0 && <b>{unread}</b>}</Link>)}
        </div>}
      </div>;
    })}
  </nav>;
}
