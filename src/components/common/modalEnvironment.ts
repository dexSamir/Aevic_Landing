/** Shared modal ownership keeps nested dialogs from unlocking the page early. */
const stack: HTMLElement[] = [];
let restorePage: (() => void) | undefined;
export function enterModal(panel: HTMLElement) {
  if (!stack.length) {
    const body = document.body, root = document.getElementById('root');
    const original = body.getAttribute('style');
    const inert = root?.inert;
    const x = window.scrollX, y = window.scrollY;
    const gutter = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    body.style.position = 'fixed'; body.style.top = `-${y}px`; body.style.left = `-${x}px`;
    body.style.width = '100%'; body.style.overflow = 'hidden';
    if (gutter) body.style.paddingRight = `${parseFloat(getComputedStyle(body).paddingRight) + gutter}px`;
    if (root) root.inert = true;
    restorePage = () => {
      if (original === null) body.removeAttribute('style'); else body.setAttribute('style', original);
      if (root) root.inert = inert ?? false;
      const html = document.documentElement, behavior = html.style.scrollBehavior;
      html.style.scrollBehavior = 'auto'; window.scrollTo(x, y); html.style.scrollBehavior = behavior;
    };
  }
  if (stack.length) stack[stack.length - 1].inert = true;
  stack.push(panel);
  return () => {
    const index = stack.indexOf(panel); if (index >= 0) stack.splice(index, 1);
    if (!stack.length) { restorePage?.(); restorePage = undefined; }
    else stack[stack.length - 1].inert = false;
  };
}
export const isTopModal = (panel: HTMLElement) => stack[stack.length - 1] === panel;
