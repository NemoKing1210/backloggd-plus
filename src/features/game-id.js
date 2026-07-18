import { settings, t } from '../state.js';
import { fmt } from '../i18n/index.js';
import { showToast } from './toast.js';

const GAME_ID_ATTR = 'data-blp-game-id';

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  ta.remove();
  if (!ok) throw new Error('copy failed');
}

export function readBackloggdGameId() {
  const meta = document.getElementById('game-page-meta');
  const raw = meta?.getAttribute('data-game-id') || '';
  const id = String(raw).trim();
  return /^\d+$/.test(id) ? id : '';
}

export function removeGameIdUi() {
  document.querySelectorAll(`[${GAME_ID_ATTR}]`).forEach((el) => el.remove());
}

function titleHeadings() {
  const seen = new Set();
  const out = [];
  for (const h1 of document.querySelectorAll('#game-body .game-title-section h1')) {
    // Skip rating / stats headings that are not the game title
    if (h1.closest('#game-rating, #ratings-bars-height, .game-rating')) continue;
    if (seen.has(h1)) continue;
    seen.add(h1);
    out.push(h1);
  }
  return out;
}

function ensureGameIdEl(h1, id) {
  let el = h1.querySelector(`[${GAME_ID_ATTR}]`);
  if (el) {
    if (el.getAttribute(GAME_ID_ATTR) === id) return el;
    el.remove();
  }
  el = document.createElement('button');
  el.type = 'button';
  el.setAttribute(GAME_ID_ATTR, id);
  el.className = 'blp-game-id';
  el.textContent = `#${id}`;
  el.title = t.gameIdCopyLabel || '';
  el.setAttribute('aria-label', t.gameIdCopyLabel || `Copy ${id}`);
  el.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await copyTextToClipboard(id);
      showToast(fmt(t.toastGameIdCopied, { id }), {
        type: 'success',
        title: t.toastGameIdCopiedTitle,
      });
    } catch {
      showToast(t.toastExportCopyFailed, {
        type: 'error',
        title: t.toastExportCopyFailedTitle,
      });
    }
  });
  h1.appendChild(el);
  return el;
}

/** Mount or remove the Backloggd game ID after the title. */
export function syncGameIdUi() {
  if (!settings.showGameId) {
    removeGameIdUi();
    return;
  }
  const id = readBackloggdGameId();
  if (!id) {
    removeGameIdUi();
    return;
  }
  const headings = titleHeadings();
  if (!headings.length) {
    removeGameIdUi();
    return;
  }
  const keep = new Set();
  for (const h1 of headings) {
    keep.add(ensureGameIdEl(h1, id));
  }
  document.querySelectorAll(`[${GAME_ID_ATTR}]`).forEach((el) => {
    if (!keep.has(el)) el.remove();
  });
}
