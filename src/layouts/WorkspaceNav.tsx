import './workspace-nav.css';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type SideNavLink = { to: string; label: string; icon: LucideIcon; group?: string };

export function SidebarNav({ links, onNavigate, unread = 0, label = 'Məhsul naviqasiyası', revealActive = false }: { revealActive?: boolean; links: SideNavLink[]; onNavigate?: () => void; unread?: number; label?: string }) {
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
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!revealActive || !activeGroup) return;
    setOpenOverride(current => ({ ...current, [activeGroup]: true }));
  }, [active, activeGroup, revealActive]);
  useEffect(() => {
    if (!revealActive) return;
    const nav = navRef.current;
    const selected = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !selected || !nav.clientHeight || nav.scrollHeight <= nav.clientHeight) return;
    const bounds = nav.getBoundingClientRect(), item = selected.getBoundingClientRect();
    if (item.bottom > bounds.bottom - 8) nav.scrollTop += item.bottom - bounds.bottom + 8;
    else if (item.top < bounds.top + 8) nav.scrollTop -= bounds.top - item.top + 8;
  }, [active, openOverride, revealActive]);
  return <nav ref={navRef} className="side-nav" aria-label={label}>
    {groups.map((section, sectionIndex) => {
      const key = section.name ?? `group-${sectionIndex}`;
      const defaultOpen = label !== 'Admin naviqasiyası' || sectionIndex === 0 || section.name === activeGroup;
      const isOpen = openOverride[key] ?? defaultOpen;
      return <div className="side-nav__section" key={key}>
        {section.name && <button type="button" className="side-nav__group" aria-expanded={isOpen} onClick={() => setOpenOverride((current) => ({ ...current, [key]: !isOpen }))}>
          <small>{section.name}</small>
          <ChevronDown size={14} className={isOpen ? 'side-nav__group-chevron is-open' : 'side-nav__group-chevron'} aria-hidden="true" />
        </button>}
        {isOpen && <div className="side-nav__group-items">
          {section.items.map(({ to, label: linkLabel, icon: Icon }) => <Link key={to} to={to} className={active === to ? 'active' : undefined} aria-current={active === to ? 'page' : undefined} onClick={onNavigate}><span className="side-nav__icon"><Icon size={19} aria-hidden="true" /></span><span>{linkLabel}</span>{linkLabel === 'Bildirişlər' && unread > 0 && <b>{unread}</b>}</Link>)}
        </div>}
      </div>;
    })}
  </nav>;
}
