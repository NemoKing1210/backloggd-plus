import { t } from '../state.js';
import { escapeAttr, escapeHtml } from '../utils/html.js';

const HOST_ID = 'blp-toast-host';
const QUEUE_KEY = 'blp_toast_queue';
const DEFAULT_MS = 4200;
const MAX_VISIBLE = 4;
const MAX_QUEUED = 5;

const TOAST_ICONS = {
  success:
    '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 10.5 8.2 13.7 15 6.5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  info: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7.25" stroke="currentColor" stroke-width="1.8"/><path d="M10 9v4.5M10 6.5h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  warning:
    '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 3.5 17.5 16H2.5L10 3.5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M10 8v4M10 14h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  error:
    '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7.25" stroke="currentColor" stroke-width="1.8"/><path d="m7.2 7.2 5.6 5.6M12.8 7.2l-5.6 5.6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
};

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

function normalizeType(type) {
  return ['info', 'success', 'warning', 'error'].includes(type) ? type : 'info';
}

function defaultTitle(type) {
  if (type === 'success') return t.toastTitleSuccess || 'Success';
  if (type === 'warning') return t.toastTitleWarning || 'Notice';
  if (type === 'error') return t.toastTitleError || 'Error';
  return t.toastTitleInfo || 'Info';
}

function resolveToastArgs(messageOrOpts, options = {}) {
  let title = '';
  let message = '';
  let opts = options;

  if (messageOrOpts && typeof messageOrOpts === 'object' && !Array.isArray(messageOrOpts)) {
    opts = { ...messageOrOpts, ...options };
    title = opts.title || '';
    message = opts.message || opts.description || '';
  } else {
    message = String(messageOrOpts || '');
    title = options.title || '';
  }

  const type = normalizeType(opts.type);
  title = String(title || '').trim() || defaultTitle(type);
  message = String(message || '').trim();

  const duration =
    Number.isFinite(opts.duration) && opts.duration > 0 ? opts.duration : DEFAULT_MS;

  return { title, message, type, duration };
}

/**
 * @param {string | { title?: string, message?: string, description?: string, type?: string, duration?: number }} messageOrOpts
 * @param {{ title?: string, type?: 'info' | 'success' | 'warning' | 'error', duration?: number }} [options]
 */
export function showToast(messageOrOpts, options = {}) {
  const { title, message, type, duration } = resolveToastArgs(messageOrOpts, options);
  if (!title && !message) return null;

  const host = ensureHost();
  while (host.children.length >= MAX_VISIBLE) {
    dismissToast(host.firstElementChild);
  }

  const dismissLabel = t.toastDismiss || 'Dismiss';
  const el = document.createElement('div');
  el.className = `blp-toast blp-toast--${type}`;
  el.setAttribute('role', 'status');
  el.innerHTML =
    `<span class="blp-toast__icon" aria-hidden="true">${TOAST_ICONS[type]}</span>` +
    `<span class="blp-toast__body">` +
    (title ? `<span class="blp-toast__title">${escapeHtml(title)}</span>` : '') +
    (message ? `<span class="blp-toast__text">${escapeHtml(message)}</span>` : '') +
    `</span>` +
    `<button type="button" class="blp-toast__close" aria-label="${escapeAttr(dismissLabel)}">` +
    `<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 4 8 8M12 4 4 12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>` +
    `</button>` +
    (duration < Infinity
      ? `<span class="blp-toast__progress" style="--blp-toast-ms:${duration}ms"></span>`
      : '');

  const closeBtn = el.querySelector('.blp-toast__close');
  closeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    dismissToast(el);
  });
  el.addEventListener('click', (e) => {
    if (e.target.closest('.blp-toast__close')) return;
    dismissToast(el);
  });

  host.appendChild(el);
  requestAnimationFrame(() => {
    el.classList.add('is-in');
  });

  if (duration < Infinity) {
    let remaining = duration;
    let startedAt = Date.now();
    let timer = setTimeout(() => dismissToast(el), remaining);
    const progress = el.querySelector('.blp-toast__progress');

    el.addEventListener('mouseenter', () => {
      clearTimeout(timer);
      remaining -= Date.now() - startedAt;
      if (progress) progress.style.animationPlayState = 'paused';
    });
    el.addEventListener('mouseleave', () => {
      if (el.dataset.blpLeaving === '1') return;
      startedAt = Date.now();
      timer = setTimeout(() => dismissToast(el), Math.max(0, remaining));
      if (progress) progress.style.animationPlayState = 'running';
    });
  }

  return el;
}

/** Persist a toast across the next page load (e.g. after settings save + reload). */
export function queueToast(messageOrOpts, options = {}) {
  const { title, message, type, duration } = resolveToastArgs(messageOrOpts, options);
  if (!title && !message) return;
  try {
    const raw = sessionStorage.getItem(QUEUE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const next = Array.isArray(list) ? list : [];
    next.push({ title, message, type, duration });
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(next.slice(-MAX_QUEUED)));
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
  setTimeout(() => {
    for (const item of list) {
      if (!item) continue;
      // Legacy queue entries only had `message`
      showToast({
        title: item.title || '',
        message: item.message || '',
        type: item.type || 'info',
        duration: item.duration,
      });
    }
  }, 120);
}
