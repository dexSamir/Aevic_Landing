import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './tooltip.css';

/** One delegated tooltip layer for native controls, SVG charts and Tooltip wrappers. */
export function TooltipLayer() {
  const id = useId();
  const [active, setActive] = useState<{ target: Element; label: string }>();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let target: Element | undefined;
    const close = () => { clearTimeout(timer); target = undefined; setActive(undefined); };
    const find = (node: EventTarget | null) => node instanceof Element ? node.closest('[data-tooltip]') : null;
    const show = (node: Element | null) => {
      if (!node || node === target) return;
      close(); target = node;
      timer = setTimeout(() => {
        const label = node.getAttribute('data-tooltip');
        if (node.isConnected && label) setActive({ target: node, label });
      }, 500);
    };
    const over = (event: PointerEvent) => { if (event.pointerType !== 'touch') show(find(event.target)); };
    const out = (event: PointerEvent) => {
      if (event.relatedTarget instanceof Node && (target?.contains(event.relatedTarget) || panel.current?.contains(event.relatedTarget))) return;
      close();
    };
    const focus = (event: FocusEvent) => show(find(event.target));
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    document.addEventListener('pointerover', over);
    document.addEventListener('pointerout', out);
    document.addEventListener('pointerdown', close);
    document.addEventListener('focusin', focus);
    document.addEventListener('focusout', close);
    document.addEventListener('keydown', key);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      close();
      document.removeEventListener('pointerover', over);
      document.removeEventListener('pointerout', out);
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('focusin', focus);
      document.removeEventListener('focusout', close);
      document.removeEventListener('keydown', key);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, []);
  useLayoutEffect(() => {
    if (!active || !panel.current) return;
    const node = panel.current;
    const rect = active.target.getBoundingClientRect();
    const bounds = node.getBoundingClientRect();
    const left = Math.max(8, Math.min(window.innerWidth - bounds.width - 8, rect.left + (rect.width - bounds.width) / 2));
    const top = Math.max(8, Math.min(window.innerHeight - bounds.height - 8, rect.top >= bounds.height + 12 ? rect.top - bounds.height - 8 : rect.bottom + 8));
    node.style.left = `${left}px`;
    node.style.top = `${top}px`;
    const described = document.activeElement && active.target.contains(document.activeElement) ? document.activeElement : active.target;
    const previous = described.getAttribute('aria-describedby');
    described.setAttribute('aria-describedby', [previous, id].filter(Boolean).join(' '));
    return () => { if (previous) described.setAttribute('aria-describedby', previous); else described.removeAttribute('aria-describedby'); };
  }, [active, id]);
  return active ? createPortal(<div ref={panel} id={id} role="tooltip" className="aevic-tooltip">{active.label}</div>, document.body) : null;
}
