import { settings, t } from '../state.js';

export function cacheSourceLabel(source) {
  if (source === 'hit') return t.debugCacheHit;
  if (source === 'miss') return t.debugCacheMiss;
  if (source === 'mixed') return t.debugCacheMixed;
  return t.debugCacheNa;
}

/** Debug-only: hatch a section and show Cache / Network / Mixed badge. */
export function paintDebugCacheMark(el, source, { titleSelector = '.game-details-header' } = {}) {
  if (!el) return;
  const variants = ['hit', 'miss', 'mixed', 'na'];
  el.classList.remove('blp-debug-cache', ...variants.map((v) => `blp-debug-cache--${v}`));
  const titleEl = el.querySelector(titleSelector);
  titleEl?.querySelector('.blp-cache-badge')?.remove();

  if (!settings.debugMode) return;

  const src = variants.includes(source) ? source : 'na';
  el.classList.add('blp-debug-cache', `blp-debug-cache--${src}`);
  if (!titleEl) return;
  const badge = document.createElement('span');
  badge.className = `blp-cache-badge blp-cache-badge--${src}`;
  badge.textContent = cacheSourceLabel(src);
  badge.title = cacheSourceLabel(src);
  titleEl.appendChild(badge);
}
