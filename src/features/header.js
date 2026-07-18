import { settings } from '../state.js';

const ATTR = 'data-blp-floating-header';
const COMPACT_ATTR = 'data-blp-header-compact';
const SCROLL_THRESHOLD_PX = 12;

let scrollBound = false;

function onScroll() {
  if (!document.documentElement.hasAttribute(ATTR)) return;
  document.documentElement.toggleAttribute(
    COMPACT_ATTR,
    window.scrollY > SCROLL_THRESHOLD_PX
  );
}

/** Sticky glass navbar (#primary-nav) when Settings → UI → enhance header is on. */
export function applyFloatingHeader() {
  const root = document.documentElement;
  if (settings.enhanceHeader === true) {
    root.setAttribute(ATTR, '1');
    if (!scrollBound) {
      scrollBound = true;
      window.addEventListener('scroll', onScroll, { passive: true });
    }
    onScroll();
  } else {
    root.removeAttribute(ATTR);
    root.removeAttribute(COMPACT_ATTR);
  }
}
