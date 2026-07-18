import { STEAMDB_ATTR } from '../constants.js';
import { fmt } from '../i18n/index.js';
import { settings, t } from '../state.js';
import { debounce } from '../utils/debounce.js';
import { escapeAttr, escapeHtml } from '../utils/html.js';
import { getGameTitle, getPageContext } from './page.js';
import { showToast } from './toast.js';

function loggingSidebarMount() {
  return (
    document.querySelector('#logging-sidebar-section > div > div') ||
    document.querySelector('#logging-sidebar-section .col.col-md-5') ||
    document.querySelector('#logging-sidebar-section .col-md-5') ||
    document.querySelector('#logging-sidebar-section .col')
  );
}

function isExportEnabled() {
  return settings.showExport === true;
}

/** Backloggd half-star scale (1–10) → Notion-style labels (ascending). */
export const RATING_LABELS = [
  'Terrible',
  'Bad',
  'Mediocre',
  'Normal',
  'Good',
  'Great',
  'Excellent',
  'Amazing',
];

/** CSV / Notion property order matching the user's Notion game page export. */
export const EXPORT_COLUMNS = [
  'Name',
  'Favorite',
  'Status',
  'Rating',
  'Expected Rating',
  'Difficulty',
  'Received',
  'Platform',
  'Date start',
  'Date end',
  'Time to Complete',
  'Developer',
  'Release date',
  'Franchise',
  'Is DLC',
  'Tags',
  'Advantages',
  'Disadvantages',
  'Passing',
  'Source',
];

const EXPORT_ATTR = 'data-blp-export';
const EXPORT_BACKDROP = 'blp-export-backdrop';
/**
 * Map Backloggd rating (1 = ½★ … 10 = 5★) to a text label.
 * Mid ladder: 2½★ Normal · 3★ Good · 3½★ Great · 4★/4½★ Excellent · 5★ Amazing.
 */
export function ratingScoreToLabel(score10) {
  const n = Math.round(Number(score10));
  if (!Number.isFinite(n) || n < 1) return '';
  switch (Math.min(10, Math.max(1, n))) {
    case 1:
      return 'Terrible'; // ½★
    case 2:
      return 'Bad'; // 1★
    case 3:
      return 'Mediocre'; // 1½★
    case 4:
      return 'Mediocre'; // 2★
    case 5:
      return 'Normal'; // 2½★
    case 6:
      return 'Good'; // 3★
    case 7:
      return 'Great'; // 3½★
    case 8:
      return 'Excellent'; // 4★
    case 9:
      return 'Excellent'; // 4½★
    case 10:
      return 'Amazing'; // 5★
    default:
      return '';
  }
}

/** Backloggd internal 1–10 → stars out of 5 (½ steps), e.g. 9 → "4.5". */
export function ratingScoreToNumeric(score10) {
  const n = Math.round(Number(score10));
  if (!Number.isFinite(n) || n < 1) return '';
  const stars = Math.min(10, Math.max(1, n)) / 2;
  return Number.isInteger(stars) ? String(stars) : stars.toFixed(1);
}

export function formatExportRating(score10, style = 'text') {
  if (score10 == null) return '';
  return style === 'numeric' ? ratingScoreToNumeric(score10) : ratingScoreToLabel(score10);
}

export function csvEscape(value) {
  const s = value == null ? '' : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function rowsToCsv(rows, columns = EXPORT_COLUMNS) {
  const lines = [columns.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(columns.map((col) => csvEscape(row[col] ?? '')).join(','));
  }
  return `${lines.join('\r\n')}\r\n`;
}

function downloadBlob(filename, text, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;left:-9999px;top:0';
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  ta.remove();
  if (!ok) throw new Error('copy failed');
}

function slugifyFilename(name) {
  return (
    String(name || 'game')
      .trim()
      .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '')
      .replace(/\s+/g, ' ')
      .slice(0, 80) || 'game'
  );
}

export function getUserRatingScore10() {
  const modal = getLogEditorRoot();
  if (modal) {
    const checked = modal.querySelector('#modal-rating input[name="rating_modal"]:checked');
    if (checked) {
      const n = Number(checked.value);
      if (Number.isFinite(n) && n >= 1 && n <= 10) return n;
    }
  }
  const checked = document.querySelector(
    '#logging-sidebar-section .star-rating-game input.star-radio:checked, .star-rating-game input.star-radio:checked'
  );
  if (checked) {
    const n = Number(checked.value);
    if (Number.isFinite(n) && n >= 1 && n <= 10) return n;
  }
  return null;
}

function isPlayButtonActive(btn) {
  if (!btn) return false;
  const type = String(btn.getAttribute('play_type') || '').trim().toLowerCase();
  if (type) return true;
  if (btn.classList.contains('active') || btn.classList.contains('selected')) return true;
  if (btn.getAttribute('aria-pressed') === 'true') return true;
  const host = btn.closest('[class*="-btn-container"]');
  if (host?.classList.contains('active') || host?.classList.contains('selected')) return true;
  return false;
}

export function normalizePlatformLabel(name) {
  const s = String(name || '').trim();
  if (!s) return '';
  if (/^windows\s*pc$/i.test(s)) return 'PC';
  return s;
}

export function getLogEditorRoot() {
  return (
    document.querySelector('#log-editor-full') ||
    document.querySelector('#journal-game-modal .modal-content #log-editor-full') ||
    document.querySelector('#journal-game-modal .modal-body')
  );
}

function selectpickerLabel(selectId, root = document) {
  const btn = root.querySelector(`button[data-id="${selectId}"]`);
  const fromBtn = (btn?.querySelector('.filter-option-inner-inner')?.textContent || btn?.getAttribute('title') || '')
    .trim();
  if (fromBtn && !/select|choose|ex:/i.test(fromBtn)) return fromBtn;
  const sel = root.querySelector(`#${selectId}`);
  if (!sel) return '';
  const opt = sel.querySelector('option:checked') || [...sel.selectedOptions || []][0];
  return (opt?.textContent || '').trim();
}

function normalizeStatusKey(raw) {
  const v = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if (!v) return '';
  if (v === 'completed' || v === 'played' || v === 'done') return 'played';
  if (v === 'playing' || v === 'in progress') return 'playing';
  if (v === 'backlog') return 'backlog';
  if (v === 'wishlist') return 'wishlist';
  if (v === 'retired') return 'retired';
  if (v === 'shelved') return 'shelved';
  if (v === 'abandoned') return 'abandoned';
  return '';
}

/** Notion Status options the user keeps in their games DB. */
export const NOTION_STATUS_LABELS = [
  'Not started',
  'Planned',
  'Deferred',
  'In progress',
  'Dropped',
  'Tried',
  'Done',
];

/** Backloggd status key → Notion Status. */
export const STATUS_TO_NOTION = {
  wishlist: 'Planned',
  backlog: 'Planned',
  playing: 'In progress',
  shelved: 'Deferred',
  abandoned: 'Dropped',
  retired: 'Tried',
  played: 'Done',
};

/** Backloggd status key → original site label. */
export const STATUS_TO_BACKLOGGD = {
  wishlist: 'Wishlist',
  backlog: 'Backlog',
  playing: 'Playing',
  shelved: 'Shelved',
  abandoned: 'Abandoned',
  retired: 'Retired',
  played: 'Played',
};

/**
 * @param {string} statusKey canonical Backloggd key (played, playing, …)
 * @param {'notion'|'original'} style
 */
export function formatExportStatus(statusKey, style = 'notion') {
  const key = normalizeStatusKey(statusKey);
  if (style === 'original') {
    if (!key) return '';
    return STATUS_TO_BACKLOGGD[key] || '';
  }
  if (!key) return 'Not started';
  return STATUS_TO_NOTION[key] || '';
}

/** Prefer full log editor when open. Returns a canonical Backloggd status key. */
export function getUserPlayStatusKey() {
  const modal = getLogEditorRoot();
  if (modal) {
    if (modal.querySelector('#playing_toggle_checkbox:checked')) return 'playing';
    if (modal.querySelector('#backlog_toggle_checkbox:checked')) return 'backlog';
    if (modal.querySelector('#wishlist_toggle_checkbox:checked')) return 'wishlist';
    const status = modal.querySelector('#status')?.value;
    const fromValue = normalizeStatusKey(status);
    if (fromValue) return fromValue;
    const label = (modal.querySelector('#play-label-title')?.textContent || '').trim();
    return normalizeStatusKey(label);
  }
  const checks = [
    ['.played-btn-container .btn-play, .played-btn-container button', 'played'],
    ['.playing-btn-container .btn-play, .playing-btn-container button', 'playing'],
    ['.backlog-btn-container .btn-play, .backlog-btn-container button', 'backlog'],
    ['.wishlist-btn-container .btn-play, .wishlist-btn-container button', 'wishlist'],
  ];
  for (const [sel, status] of checks) {
    const nodes = document.querySelectorAll(`#logging-sidebar-section ${sel}`);
    for (const btn of nodes) {
      if (isPlayButtonActive(btn)) return status;
    }
  }
  return '';
}

/** @deprecated use getUserPlayStatusKey + formatExportStatus */
export function getUserPlayStatus() {
  return formatExportStatus(getUserPlayStatusKey(), 'notion');
}

export function getUserFavorite() {
  const modal = getLogEditorRoot();
  if (modal) {
    const liked = modal.querySelector('#log_liked_checkbox');
    if (liked) return liked.checked ? 'Yes' : 'No';
  }
  const like = document.querySelector(
    '#logging-sidebar-section .like-game-btn, .like-game-btn'
  );
  if (!like) return '';
  if (like.classList.contains('active') || like.classList.contains('liked')) return 'Yes';
  if (like.querySelector('.fa-solid.fa-heart, i.fa-heart.fa-solid')) return 'Yes';
  if (like.querySelector('.fa-regular.fa-heart')) return 'No';
  return '';
}

export function getLogEditorPlatform() {
  const modal = getLogEditorRoot();
  if (!modal) return '';
  const fromSelect = selectpickerLabel('playthrough_platform', modal);
  if (fromSelect) return normalizePlatformLabel(fromSelect);
  const tab = (
    modal.querySelector('#playthrough-container .btn-nav.current .playthrough-option-title')
      ?.textContent || ''
  ).trim();
  return normalizePlatformLabel(tab);
}

export function getLogEditorDates() {
  const modal = getLogEditorRoot();
  if (!modal) return { start: '', end: '' };
  const start = (modal.querySelector('#started-on-datepicker')?.value || '').trim();
  const end = (modal.querySelector('#finished-on-datepicker')?.value || '').trim();
  return {
    start: formatNotionDate(start),
    end: formatNotionDate(end),
  };
}

/** Keep Notion-friendly dates when we can parse; otherwise pass through. */
export function formatNotionDate(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    try {
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (_) {
      /* fall through */
    }
  }
  return s;
}

export function getLogEditorTimeToComplete() {
  const modal = getLogEditorRoot();
  if (!modal) return '';
  const hoursFrom = (hSel, mSel) => {
    const h = Number(modal.querySelector(hSel)?.value);
    const m = Number(modal.querySelector(mSel)?.value);
    const hrs = Number.isFinite(h) ? h : 0;
    const mins = Number.isFinite(m) ? m : 0;
    if (hrs <= 0 && mins <= 0) return '';
    const total = hrs + mins / 60;
    return Number.isInteger(total) ? String(total) : String(Math.round(total * 10) / 10);
  };
  return (
    hoursFrom('#playthrough-time-finished-hours', '#playthrough-time-finished-minutes') ||
    hoursFrom('#playthrough-time-played-hours', '#playthrough-time-played-minutes') ||
    ''
  );
}

export function getIsDlc() {
  const el = document.querySelector('.game-parent-category');
  if (!el) return 'No';
  const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
  return /DLC/i.test(text) ? 'Yes' : 'No';
}

export function getLogEditorTitle() {
  const modal = getLogEditorRoot();
  if (!modal) return '';
  const h2 = modal.querySelector('h2.main-header');
  if (!h2) return '';
  const clone = h2.cloneNode(true);
  clone.querySelectorAll('small').forEach((n) => n.remove());
  return (clone.textContent || '').trim();
}

export function getGameDevelopers() {
  const links = [
    ...document.querySelectorAll(
      '#game-body .game-title-section a[href*="/company/"], #interaction-sidebar .game-subtitle a[href*="/company/"]'
    ),
  ];
  const names = [];
  for (const a of links) {
    const name = (a.textContent || '').trim();
    if (name && !names.includes(name)) names.push(name);
  }
  return names.join(', ');
}

export function getGameReleaseDate() {
  const link = document.querySelector(
    '#game-body a[href*="release_year:"], #game_detail_section a[href*="release_year:"], a.game-year'
  );
  const candidates = [
    ...document.querySelectorAll(
      '#game-body a[href*="release_year:"], #game_detail_section a[href*="release_year:"]'
    ),
  ]
    .map((a) => (a.textContent || '').trim())
    .filter((text) => /\d/.test(text) && /[a-z]/i.test(text));
  if (candidates.length) return candidates[0];
  return (link?.textContent || '').trim();
}

export function getGamePlatforms() {
  const fromLog = getLogEditorPlatform();
  if (fromLog) return fromLog;
  const root =
    document.querySelector('#game-body #game-page-platforms, #game-page-platforms') ||
    document.querySelector('#game_detail_section');
  if (!root) return '';
  const platforms = [...root.querySelectorAll('a[href*="release_platform:"]')]
    .map((a) => (a.textContent || '').trim())
    .filter(Boolean);
  const uniq = [...new Set(platforms)];
  return uniq.map((p) => normalizePlatformLabel(p)).join(', ');
}

export function getSteamTagsFromDom() {
  const tags = [...document.querySelectorAll('[data-blp-enrich="steam"] .blp-steam-tag')]
    .map((el) => (el.textContent || '').trim())
    .filter(Boolean);
  return [...new Set(tags)].join(', ');
}

export function getSteamSourceUrl() {
  const appId =
    document.querySelector(`[${STEAMDB_ATTR}="cover"]`)?.getAttribute('data-blp-appid') ||
    document.querySelector(`[${STEAMDB_ATTR}="icon"]`)?.getAttribute('data-blp-appid') ||
    '';
  if (appId) return `https://store.steampowered.com/app/${appId}/`;
  const link = document.querySelector(
    '[data-blp-enrich="links"] a[href*="store.steampowered.com/app/"]'
  );
  return link?.href?.split('?')[0] || '';
}

export function getHltbMainHours() {
  const row = document.querySelector(`[data-blp-enrich="hltb"]`);
  if (!row) return '';
  const text = row.textContent || '';
  const m = text.match(/Main\s+([\d.]+)\s*h/i) || text.match(/([\d.]+)\s*h/);
  return m ? m[1] : '';
}

export function collectGameExportRecord() {
  const dates = getLogEditorDates();
  const title = getLogEditorTitle() || getGameTitle();
  const ratingScore = getUserRatingScore10();
  const time =
    getLogEditorTimeToComplete() || getHltbMainHours();
  return {
    Name: title,
    Favorite: getUserFavorite(),
    Status: '',
    Rating: '',
    'Expected Rating': '',
    Difficulty: '',
    Received: '',
    Platform: getGamePlatforms(),
    'Date start': dates.start,
    'Date end': dates.end,
    'Time to Complete': time,
    Developer: getGameDevelopers(),
    'Release date': getGameReleaseDate(),
    Franchise: '',
    'Is DLC': getIsDlc(),
    Tags: getSteamTagsFromDom(),
    Advantages: '',
    Disadvantages: '',
    Passing: '',
    Source: getSteamSourceUrl(),
    _ratingScore10: ratingScore,
    _statusKey: getUserPlayStatusKey(),
  };
}

export function buildExportRow(record, { ratingStyle = 'text', statusStyle = 'notion' } = {}) {
  const row = {};
  for (const col of EXPORT_COLUMNS) row[col] = record[col] ?? '';
  row.Rating = formatExportRating(record._ratingScore10, ratingStyle);
  row.Status = formatExportStatus(record._statusKey, statusStyle);
  return row;
}

export function buildNotionCsv(record, opts = {}) {
  return rowsToCsv([buildExportRow(record, opts)]);
}

/** Notion-style page markdown: `# Title` + `Property: value` lines (same columns as CSV). */
export function buildNotionMarkdown(record, opts = {}) {
  const row = buildExportRow(record, opts);
  const lines = [`# ${row.Name || 'Untitled'}`, ''];
  for (const col of EXPORT_COLUMNS) {
    if (col === 'Name') continue;
    lines.push(`${col}: ${row[col] ?? ''}`);
  }
  return `${lines.join('\n')}\n`;
}

export function buildNotionJson(record, opts = {}) {
  return `${JSON.stringify(buildExportRow(record, opts), null, 2)}\n`;
}

const EXPORT_FORMATS = {
  csv: {
    ext: 'csv',
    mime: 'text/csv;charset=utf-8',
    bom: true,
    build: buildNotionCsv,
  },
  markdown: {
    ext: 'md',
    mime: 'text/markdown;charset=utf-8',
    bom: false,
    build: buildNotionMarkdown,
  },
  json: {
    ext: 'json',
    mime: 'application/json;charset=utf-8',
    bom: false,
    build: buildNotionJson,
  },
};

export function buildExportPayload(format, record, opts = {}) {
  const spec = EXPORT_FORMATS[format];
  if (!spec) return null;
  const body = spec.build(record, opts);
  return {
    ext: spec.ext,
    mime: spec.mime,
    text: spec.bom ? `\uFEFF${body}` : body,
    copyText: body,
  };
}

export function removeExportUi({ includeLogEditor = true } = {}) {
  document.querySelectorAll(`[${EXPORT_ATTR}="btn"]`).forEach((el) => el.remove());
  if (includeLogEditor) {
    document.querySelectorAll(`[${EXPORT_ATTR}="log-btn"]`).forEach((el) => el.remove());
  }
  document.querySelectorAll(`.${EXPORT_BACKDROP}`).forEach((el) => el.remove());
}

function bindExportOpen(btn) {
  if (!btn || btn.dataset.blpExportBound === '1') return;
  btn.dataset.blpExportBound = '1';
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openExportDialog();
  });
}

export function ensureExportButtonMount(token = '') {
  if (!isExportEnabled() || !getPageContext().isGamePage) {
    document.querySelectorAll(`[${EXPORT_ATTR}="btn"]`).forEach((el) => el.remove());
    return null;
  }

  let wrap = document.querySelector(`[${EXPORT_ATTR}="btn"]`);
  const cover = document.querySelector(`[${STEAMDB_ATTR}="cover"]`);
  const mount = cover?.parentElement || loggingSidebarMount();
  if (!mount) return null;

  if (!wrap) {
    wrap = document.createElement('div');
    wrap.setAttribute(EXPORT_ATTR, 'btn');
    wrap.className = 'blp-export-wrap';
    wrap.innerHTML = `
      <button type="button" class="btn btn-main blp-export-btn" data-blp-export-open>
        ${escapeHtml(t.exportButton)}
      </button>
    `;
    bindExportOpen(wrap.querySelector('[data-blp-export-open]'));
  }

  if (token) wrap.setAttribute('data-blp-token', token);

  if (cover) {
    if (wrap.previousElementSibling !== cover) {
      cover.insertAdjacentElement('afterend', wrap);
    }
  } else if (wrap.parentElement !== mount) {
    mount.appendChild(wrap);
  }

  return wrap;
}

/** Export control in the full/quick log editor footer (dates, platform, rating). */
export function ensureLogEditorExportMount() {
  if (!isExportEnabled()) {
    document.querySelectorAll(`[${EXPORT_ATTR}="log-btn"]`).forEach((el) => el.remove());
    return null;
  }

  const footer = document.querySelector('#log-editor-footer');
  if (!footer) return null;

  let wrap = footer.querySelector(`[${EXPORT_ATTR}="log-btn"]`);
  if (wrap) return wrap;

  wrap = document.createElement('div');
  wrap.setAttribute(EXPORT_ATTR, 'log-btn');
  wrap.className = 'blp-export-log-wrap col-auto my-auto pr-0';
  wrap.innerHTML = `
    <button type="button" class="btn btn-main blp-export-log-btn" data-blp-export-open>
      ${escapeHtml(t.exportButton)}
    </button>
  `;
  bindExportOpen(wrap.querySelector('[data-blp-export-open]'));

  const cancelCol =
    footer.querySelector('[data-dismiss="modal"]')?.closest('.col-auto') ||
    footer.querySelector('#btn-save-log');
  if (cancelCol) {
    cancelCol.insertAdjacentElement('beforebegin', wrap);
  } else {
    footer.appendChild(wrap);
  }
  return wrap;
}

let logEditorExportObserver = null;

export function bindLogEditorExportObserver() {
  if (logEditorExportObserver) return logEditorExportObserver;
  const sync = debounce(() => {
    if (!isExportEnabled()) {
      document.querySelectorAll(`[${EXPORT_ATTR}="log-btn"]`).forEach((el) => el.remove());
      return;
    }
    if (document.querySelector('#log-editor-footer')) ensureLogEditorExportMount();
  }, 200);
  logEditorExportObserver = new MutationObserver(sync);
  logEditorExportObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  ensureLogEditorExportMount();
  return logEditorExportObserver;
}

function formatOption(name, id, label, hint, { enabled = true, checked = false } = {}) {
  return `
    <label class="blp-export-option${enabled ? '' : ' is-disabled'}">
      <input type="radio" name="${escapeAttr(name)}" value="${escapeAttr(id)}" ${
        enabled ? '' : 'disabled'
      } ${checked && enabled ? 'checked' : ''} />
      <span class="blp-export-option__body">
        <span class="blp-export-option__label">${escapeHtml(label)}${
          enabled ? '' : ` <em>${escapeHtml(t.exportSoon)}</em>`
        }</span>
        <span class="blp-export-option__hint">${escapeHtml(hint)}</span>
      </span>
    </label>
  `;
}

function previewStatusText(statusKey, statusStyle) {
  return formatExportStatus(statusKey, statusStyle) || '—';
}

function previewFieldRow(label, value, attrs = '') {
  const display = value == null || value === '' ? '—' : value;
  return `
    <div class="blp-export-preview__row" ${attrs}>
      <span class="blp-export-preview__key">${escapeHtml(label)}</span>
      <span class="blp-export-preview__val">${escapeHtml(display)}</span>
    </div>
  `;
}

function buildExportPreviewValues(record, ratingStyle = 'text', statusStyle = 'notion') {
  const values = {};
  for (const col of EXPORT_COLUMNS) values[col] = record[col] ?? '';
  values.Rating =
    record._ratingScore10 == null
      ? t.exportNoRating
      : formatExportRating(record._ratingScore10, ratingStyle) || t.exportNoRating;
  values.Status = previewStatusText(record._statusKey, statusStyle);
  return values;
}

/** Preview: field list for CSV/MD, raw JSON for the JSON format. */
function buildExportPreviewHtml(record, ratingStyle = 'text', statusStyle = 'notion', format = 'csv') {
  if (format === 'json') {
    const row = buildExportRow(record, { ratingStyle, statusStyle });
    return `
      <div class="blp-export-preview" data-blp-export-preview data-format="json">
        <p class="blp-export-section-label">${escapeHtml(t.exportPreviewTitle)}</p>
        <pre class="blp-export-preview__json">${escapeHtml(JSON.stringify(row, null, 2))}</pre>
      </div>
    `;
  }
  const values = buildExportPreviewValues(record, ratingStyle, statusStyle);
  const fields = EXPORT_COLUMNS.map((col) => {
    let attrs = '';
    if (col === 'Rating') attrs = 'data-blp-export-rating-row';
    else if (col === 'Status') attrs = 'data-blp-export-status-row';
    return previewFieldRow(col, values[col], attrs);
  }).join('');
  return `
    <div class="blp-export-preview" data-blp-export-preview data-format="${escapeAttr(format)}">
      <p class="blp-export-section-label">${escapeHtml(t.exportPreviewTitle)}</p>
      <div class="blp-export-preview__fields">
        ${fields}
      </div>
    </div>
  `;
}

export function openExportDialog() {
  if (!isExportEnabled()) return;
  if (document.querySelector(`.${EXPORT_BACKDROP}`)) return;
  if (!getPageContext().isGamePage && !getLogEditorRoot()) return;

  const record = collectGameExportRecord();

  const backdrop = document.createElement('div');
  backdrop.className = EXPORT_BACKDROP;
  backdrop.innerHTML = `
    <div class="blp-export-dialog" role="dialog" aria-modal="true" aria-label="${escapeAttr(
      t.exportTitle
    )}">
      <div class="blp-export-dialog__head">
        <h3>${escapeHtml(t.exportTitle)}</h3>
        <p class="blp-hint">${escapeHtml(t.exportHint)}</p>
      </div>
      <div class="blp-export-layout">
        <div class="blp-export-main">
          <p class="blp-export-section-label">${escapeHtml(t.exportFormats)}</p>
          <div class="blp-export-formats" role="radiogroup" aria-label="${escapeAttr(t.exportFormats)}">
            ${formatOption('blp-export-format', 'csv', t.exportFormatCsv, t.exportFormatCsvHint, {
              enabled: true,
              checked: true,
            })}
            ${formatOption(
              'blp-export-format',
              'markdown',
              t.exportFormatMarkdown,
              t.exportFormatMarkdownHint,
              { enabled: true }
            )}
            ${formatOption('blp-export-format', 'json', t.exportFormatJson, t.exportFormatJsonHint, {
              enabled: true,
            })}
          </div>
          <details class="blp-export-advanced">
            <summary class="blp-export-advanced__summary">${escapeHtml(t.exportAdvanced)}</summary>
            <div class="blp-export-advanced__body">
              <p class="blp-export-section-label">${escapeHtml(t.exportRatingFormat)}</p>
              <div class="blp-export-formats" role="radiogroup" aria-label="${escapeAttr(t.exportRatingFormat)}">
                ${formatOption(
                  'blp-export-rating',
                  'text',
                  t.exportRatingText,
                  t.exportRatingTextHint,
                  { enabled: true, checked: true }
                )}
                ${formatOption(
                  'blp-export-rating',
                  'numeric',
                  t.exportRatingNumeric,
                  t.exportRatingNumericHint,
                  { enabled: true }
                )}
              </div>
              <p class="blp-export-section-label">${escapeHtml(t.exportStatusFormat)}</p>
              <div class="blp-export-formats" role="radiogroup" aria-label="${escapeAttr(t.exportStatusFormat)}">
                ${formatOption(
                  'blp-export-status',
                  'notion',
                  t.exportStatusNotion,
                  t.exportStatusNotionHint,
                  { enabled: true, checked: true }
                )}
                ${formatOption(
                  'blp-export-status',
                  'original',
                  t.exportStatusOriginal,
                  t.exportStatusOriginalHint,
                  { enabled: true }
                )}
              </div>
            </div>
          </details>
          <div class="blp-actions">
            <button type="button" class="blp-btn" data-blp-export-cancel>${escapeHtml(t.cancel)}</button>
            <button type="button" class="blp-btn" data-blp-export-copy>${escapeHtml(t.exportCopy)}</button>
            <button type="button" class="blp-btn blp-primary" data-blp-export-run>${escapeHtml(
              t.exportDownload
            )}</button>
          </div>
        </div>
        ${buildExportPreviewHtml(record, 'text', 'notion', 'csv')}
      </div>
    </div>
  `;

  const prevOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';

  const close = () => {
    document.documentElement.style.overflow = prevOverflow;
    backdrop.remove();
  };

  const selectedRatingStyle = () =>
    backdrop.querySelector('input[name="blp-export-rating"]:checked')?.value || 'text';
  const selectedStatusStyle = () =>
    backdrop.querySelector('input[name="blp-export-status"]:checked')?.value || 'notion';
  const selectedFormat = () =>
    backdrop.querySelector('input[name="blp-export-format"]:checked')?.value || 'csv';

  const paintPreview = () => {
    const host = backdrop.querySelector('[data-blp-export-preview]');
    if (!host) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = buildExportPreviewHtml(
      record,
      selectedRatingStyle(),
      selectedStatusStyle(),
      selectedFormat()
    );
    const next = wrap.firstElementChild;
    if (next) host.replaceWith(next);
  };

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  backdrop.querySelector('[data-blp-export-cancel]')?.addEventListener('click', close);
  backdrop.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  });
  backdrop.querySelectorAll('input[name="blp-export-format"]').forEach((input) => {
    input.addEventListener('change', paintPreview);
  });
  backdrop.querySelectorAll('input[name="blp-export-rating"]').forEach((input) => {
    input.addEventListener('change', paintPreview);
  });
  backdrop.querySelectorAll('input[name="blp-export-status"]').forEach((input) => {
    input.addEventListener('change', paintPreview);
  });

  backdrop.querySelector('[data-blp-export-run]')?.addEventListener('click', () => {
    const format = selectedFormat();
    const opts = { ratingStyle: selectedRatingStyle(), statusStyle: selectedStatusStyle() };
    try {
      const payload = buildExportPayload(format, record, opts);
      if (!payload) {
        showToast(t.exportFormatUnavailable, { type: 'error' });
        return;
      }
      downloadBlob(
        `${slugifyFilename(record.Name)}.${payload.ext}`,
        payload.text,
        payload.mime
      );
      showToast(fmt(t.toastExportDone, { name: record.Name || payload.ext.toUpperCase() }), {
        type: 'success',
      });
      close();
    } catch (_) {
      showToast(t.toastExportFailed, { type: 'error' });
    }
  });

  backdrop.querySelector('[data-blp-export-copy]')?.addEventListener('click', async () => {
    const format = selectedFormat();
    const opts = { ratingStyle: selectedRatingStyle(), statusStyle: selectedStatusStyle() };
    try {
      const payload = buildExportPayload(format, record, opts);
      if (!payload) {
        showToast(t.exportFormatUnavailable, { type: 'error' });
        return;
      }
      await copyTextToClipboard(payload.copyText);
      showToast(t.toastExportCopied, { type: 'success' });
    } catch (_) {
      showToast(t.toastExportCopyFailed, { type: 'error' });
    }
  });

  document.body.appendChild(backdrop);
  backdrop.querySelector('[data-blp-export-run]')?.focus();
}

/** Keep export button after cover mounts / SPA rescans. */
export function syncExportButton(token = '') {
  if (!isExportEnabled()) {
    removeExportUi();
    return;
  }
  if (!getPageContext().isGamePage) {
    document.querySelectorAll(`[${EXPORT_ATTR}="btn"]`).forEach((el) => el.remove());
    return;
  }
  ensureExportButtonMount(token);
  ensureLogEditorExportMount();
}
