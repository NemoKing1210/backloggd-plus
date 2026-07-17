import { escapeHtml } from '../utils/html.js';

const HOST_ID = 'blp-toast-host';
const QUEUE_KEY = 'blp_toast_queue';
const DEFAULT_MS = 3800;
const MAX_VISIBLE = 4;
const MAX_QUEUED = 5;

function ensureHost() {
  let host = document.getElementById(HOST_ID);
  if (host?.isConnected) return host;
  host = document.createElement('div');
  host.id = HOST_ID;
  host.className = 'blp-toast-host';
  host.setAttribute('aria-live', 'polite');
  host.setAttribute('aria-relevant', 'additions');
  (document.body || document.documentElement).appendChild(host);
  return host;
}

function dismissToast(el) {
  if (!el || el.dataset.blpLeaving === '1') return;
  el.dataset.blpLeaving = '1';
  el.classList.add('is-leaving');
  const done = () => el.remove();
  el.addEventListener('transitionend', done, { once: true });
  setTimeout(done, 320);
}

/**
 * @param {string} message
 * @param {{ type?: 'info' | 'success' | 'warning' | 'error', duration?: number }} [options]
 */
export function showToast(message, options = {}) {
  const text = String(message || '').trim();
  if (!text) return null;

  const type = ['info', 'success', 'warning', 'error'].includes(options.type)
    ? options.type
    : 'info';
  const duration =
    Number.isFinite(options.duration) && options.duration > 0
      ? options.duration
      : DEFAULT_MS;

  const host = ensureHost();
  while (host.children.length >= MAX_VISIBLE) {
    dismissToast(host.firstElementChild);
  }

  const el = document.createElement('div');
  el.className = `blp-toast blp-toast--${type}`;
  el.setAttribute('role', 'status');
  el.innerHTML = `<span class="blp-toast__text">${escapeHtml(text)}</span>`;
  el.addEventListener('click', () => dismissToast(el));
  host.appendChild(el);

  // Enter animation on next frame
  requestAnimationFrame(() => {
    el.classList.add('is-in');
  });

  if (duration < Infinity) {
    setTimeout(() => dismissToast(el), duration);
  }
  return el;
}

/** Persist a toast across the next page load (e.g. after settings save + reload). */
export function queueToast(message, options = {}) {
  const text = String(message || '').trim();
  if (!text) return;
  try {
    const raw = sessionStorage.getItem(QUEUE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) {
      sessionStorage.setItem(QUEUE_KEY, JSON.stringify([{ message: text, type: options.type || 'info' }]));
      return;
    }
    list.push({
      message: text,
      type: options.type || 'info',
      duration: options.duration,
    });
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(list.slice(-MAX_QUEUED)));
  } catch (_) {
    /* sessionStorage may be blocked */
  }
}

export function flushQueuedToasts() {
  let list = [];
  try {
    const raw = sessionStorage.getItem(QUEUE_KEY);
    sessionStorage.removeItem(QUEUE_KEY);
    if (raw) list = JSON.parse(raw);
  } catch (_) {
    list = [];
  }
  if (!Array.isArray(list) || !list.length) return;
  // Slight delay so the host paints after layout
  setTimeout(() => {
    for (const item of list) {
      if (!item?.message) continue;
      showToast(item.message, {
        type: item.type || 'info',
        duration: item.duration,
      });
    }
  }, 120);
}
