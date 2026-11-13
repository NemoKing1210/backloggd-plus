import { ENRICH_ATTR } from '../constants.js';
import { fmt } from '../i18n/index.js';
import { settings, t } from '../state.js';
import { escapeAttr, escapeHtml } from '../utils/html.js';
import { metacriticGameUrl } from '../utils/slug.js';
import { getGameTitle, getPageContext } from './page.js';
import { gameStatsMountAnchor } from './steamdb-ui.js';

/** OpenCritic off in Settings → drop its cell and name from the title; grid goes 4 → 3 columns. */
function applyUnifiedRatingSources(tile, ocEnabled) {
  const cell = tile.querySelector('.blp-unified-rating__cell[data-blp-provider="opencritic"]');
  if (cell) cell.hidden = !ocEnabled;
  tile.querySelector('.blp-unified-rating__grid')?.classList.toggle('blp-unified-rating__grid--3', !ocEnabled);
  const title = tile.querySelector('.blp-unified-rating__title');
  const text = ocEnabled ? t.unifiedRatingHint : t.unifiedRatingHintNoOpenCritic;
  if (title && title.textContent !== text) title.textContent = text;
}

export function ensureUnifiedRatingWidget(token = '') {
  document.querySelectorAll(`#game-rating [${ENRICH_ATTR}="unified-rating"]`).forEach((el) => el.remove());

  const anchor = gameStatsMountAnchor();
  if (!anchor) return null;

  let row = document.querySelector(`.blp-unified-rating-row[${ENRICH_ATTR}="unified-rating"]`);
  if (row) {
    if (token) row.setAttribute('data-blp-token', token);
    const tile = row.querySelector('.blp-unified-rating');
    if (tile) applyUnifiedRatingSources(tile, settings.showOpenCritic !== false);
    if (row.nextElementSibling !== anchor) {
      anchor.insertAdjacentElement('beforebegin', row);
    }
    return row;
  }

  const skeletonCells = [
    ['steam', t.unifiedRatingSteam],
    ['metacritic', t.unifiedRatingMetacritic],
    ['opencritic', t.unifiedRatingOpenCritic],
    ['backloggd', t.unifiedRatingBackloggd],
  ]
    .map(
      ([key, label]) => `<div class="blp-unified-rating__cell is-loading" data-blp-provider="${key}" data-blp-status="loading">
        <span class="blp-unified-rating__cell-label">${escapeHtml(label)}</span>
        <span class="blp-skeleton blp-unified-rating__skel-value"></span>
        <span class="blp-skeleton blp-unified-rating__skel-sub"></span>
      </div>`
    )
    .join('');

  row = document.createElement('div');
  row.className = 'row blp-unified-rating-row';
  row.setAttribute(ENRICH_ATTR, 'unified-rating');
  if (token) row.setAttribute('data-blp-token', token);
  row.innerHTML = `
    <div class="col">
      <div class="backloggd-container center-container blp-unified-rating is-loading" data-grade="mid">
        <div class="blp-unified-rating__layout">
          <div class="blp-unified-rating__score-block">
            <p class="blp-unified-rating__label">${escapeHtml(t.unifiedRatingTitle)}</p>
            <p class="blp-unified-rating__num is-skel"><span class="blp-skeleton blp-unified-rating__skel-num"></span></p>
            <span class="blp-unified-rating__denom"><span class="blp-skeleton blp-unified-rating__skel-denom"></span></span>
          </div>
          <div class="blp-unified-rating__main">
            <div class="blp-unified-rating__head">
              <p class="blp-unified-rating__title">${escapeHtml(t.unifiedRatingHint)}</p>
              <p class="blp-unified-rating__hint">${escapeHtml(t.unifiedRatingLoading)}</p>
            </div>
            <div class="blp-unified-rating__meter blp-unified-rating__meter--loading">
              <div class="blp-unified-rating__meter-fill"></div>
            </div>
            <div class="blp-unified-rating__grid">${skeletonCells}</div>
          </div>
        </div>
      </div>
    </div>
  `;
  const freshTile = row.querySelector('.blp-unified-rating');
  if (freshTile) applyUnifiedRatingSources(freshTile, settings.showOpenCritic !== false);
  anchor.insertAdjacentElement('beforebegin', row);
  return row;
}

export function sanitize0to100Score(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0 || v > 100) return null;
  return v;
}

export function steamReviewsToPercent100(summary) {
  if (!summary || !summary.total_reviews) return null;
  const pct = (summary.total_positive / summary.total_reviews) * 100;
  if (!Number.isFinite(pct)) return null;
  return Math.round(pct);
}

export function getBackloggdAvgRating5FromDom() {
  const nodes = document.querySelectorAll('#game-rating h1, .game-rating h1');
  for (const h1 of nodes) {
    const raw = (h1?.textContent || '').trim().replace(',', '.');
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return Math.max(0, Math.min(5, n));
  }
  return null;
}

export function formatUnifiedScore5(n) {
  return (Math.round(n * 10) / 10).toFixed(1);
}

export function prefersReducedMotion() {
  try {
    return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  } catch (_) {
    return false;
  }
}

export let unifiedRatingNumAnim = 0;

export function animateUnifiedRatingNum(el, nextValue) {
  if (!el) return;
  const next = Number(nextValue);
  if (!Number.isFinite(next)) return;

  const reduce = prefersReducedMotion();
  const prevRaw = el.dataset.blpNum;
  const prev = prevRaw != null && prevRaw !== '' ? Number(prevRaw) : NaN;
  el.dataset.blpNum = String(next);
  el.classList.remove('is-skel');

  const finish = (v) => {
    el.textContent = formatUnifiedScore5(v);
    if (reduce) return;
    el.classList.remove('is-pulse');
    // Restart pulse animation
    void el.offsetWidth;
    el.classList.add('is-pulse');
  };

  if (reduce || !Number.isFinite(prev) || Math.abs(prev - next) < 0.05) {
    finish(next);
    return;
  }

  const animId = ++unifiedRatingNumAnim;
  const start = performance.now();
  const dur = 480;
  const from = prev;

  const frame = (now) => {
    if (animId !== unifiedRatingNumAnim) return;
    const t = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    const v = from + (next - from) * eased;
    el.textContent = formatUnifiedScore5(v);
    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      finish(next);
    }
  };
  requestAnimationFrame(frame);
}

/** Red (1★) → amber → green (5★); the bar colour follows the rating itself. */
export function unifiedRatingHue(avg5) {
  const n = Math.max(1, Math.min(5, Number(avg5) || 1));
  return Math.round(((n - 1) / 4) * 118);
}

export function setUnifiedRatingMeter(meter, fill, barWidth, { indeterminate, avg5 = null }) {
  if (!meter || !fill) return;
  fill.classList.toggle('is-graded', !indeterminate && avg5 != null);
  if (!indeterminate && avg5 != null) {
    fill.style.setProperty('--blp-ur-hue', String(unifiedRatingHue(avg5)));
  }
  if (indeterminate) {
    meter.classList.add('blp-unified-rating__meter--loading');
    fill.style.width = '36%';
    return;
  }

  const wasLoading = meter.classList.contains('blp-unified-rating__meter--loading');
  meter.classList.remove('blp-unified-rating__meter--loading');
  const target = `${Math.max(0, Math.min(100, barWidth))}%`;

  if (wasLoading || !fill.style.width || fill.style.width === '0%' || fill.style.width === '36%') {
    fill.style.transition = 'none';
    fill.style.width = '0%';
    void fill.offsetWidth;
    fill.style.removeProperty('transition');
  }
  fill.style.width = target;
}

export function paintUnifiedRatingCell(cell, provider) {
  if (!cell) return;
  const prevStatus = cell.dataset.blpStatus || '';
  const status = provider.status;
  cell.classList.toggle('is-loading', status === 'loading');
  cell.classList.toggle('is-missing', status === 'missing');

  if (status === 'loading') {
    if (prevStatus !== 'loading') {
      cell.classList.remove('has-link');
      cell.dataset.blpStatus = status;
      cell.innerHTML = `
        <span class="blp-unified-rating__cell-label">${escapeHtml(provider.label)}</span>
        <span class="blp-skeleton blp-unified-rating__skel-value"></span>
        <span class="blp-skeleton blp-unified-rating__skel-sub"></span>
      `;
    }
    return;
  }

  const url = status === 'ready' ? provider.url || '' : '';
  const displayKey = `${status}|${provider.display || ''}|${provider.score5 ?? ''}|${url}`;
  if (prevStatus === status && cell.dataset.blpDisplay === displayKey) return;
  cell.dataset.blpStatus = status;
  cell.dataset.blpDisplay = displayKey;

  const value = status === 'missing' ? t.unifiedRatingMissing : escapeHtml(provider.display);
  const sub =
    status === 'missing'
      ? ''
      : `<span class="blp-unified-rating__cell-sub">${escapeHtml(formatUnifiedScore5(provider.score5))} ★</span>`;
  const link = url
    ? `<a class="blp-unified-rating__cell-link" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeAttr(provider.label)}"></a>`
    : '';
  cell.classList.toggle('has-link', Boolean(url));
  cell.innerHTML = `
    <span class="blp-unified-rating__cell-label">${escapeHtml(provider.label)}</span>
    <span class="blp-unified-rating__cell-value">${value}</span>
    ${sub}
    ${link}
  `;

  if (status === 'ready' && prevStatus === 'loading' && !prefersReducedMotion()) {
    cell.classList.remove('is-reveal');
    void cell.offsetWidth;
    cell.classList.add('is-reveal');
  }
}

export function updateUnifiedRatingWidget(state) {
  const row = document.querySelector(`.blp-unified-rating-row[${ENRICH_ATTR}="unified-rating"]`);
  if (!row) return;
  const tile = row.querySelector('.blp-unified-rating');
  if (!tile) return;

  const steamSettled = state?.steam != null;
  const ocEnabled = settings.showOpenCritic !== false;
  const ocSettled = !ocEnabled || state?.opencritic != null;

  const backloggd5 = getBackloggdAvgRating5FromDom();
  const steamPct100 = state?.steam?.reviews ? steamReviewsToPercent100(state.steam.reviews) : null;
  const metacritic100 =
    state?.steam?.metacritic?.score != null ? sanitize0to100Score(state.steam.metacritic.score) : null;
  const opencritic100 =
    state?.opencritic?.score != null ? sanitize0to100Score(state.opencritic.score) : null;

  applyUnifiedRatingSources(tile, ocEnabled);

  const { slug } = getPageContext();
  const steamUrl = state?.steam?.appId
    ? `https://store.steampowered.com/app/${state.steam.appId}/#app_reviews_hash`
    : '';
  const metacriticUrl = metacriticGameUrl(getGameTitle(), slug);
  const opencriticUrl = state?.opencritic?.url || '';

  const providers = [
    {
      key: 'steam',
      label: t.unifiedRatingSteam,
      display: steamPct100 != null ? `${steamPct100}%` : null,
      score5: steamPct100 != null ? steamPct100 / 20 : null,
      status: !steamSettled ? 'loading' : steamPct100 != null ? 'ready' : 'missing',
      url: steamUrl,
    },
    {
      key: 'metacritic',
      label: t.unifiedRatingMetacritic,
      display: metacritic100 != null ? String(metacritic100) : null,
      score5: metacritic100 != null ? metacritic100 / 20 : null,
      status: !steamSettled ? 'loading' : metacritic100 != null ? 'ready' : 'missing',
      url: metacriticUrl,
    },
    {
      key: 'opencritic',
      label: t.unifiedRatingOpenCritic,
      display: opencritic100 != null ? String(opencritic100) : null,
      score5: opencritic100 != null ? opencritic100 / 20 : null,
      status: !ocSettled ? 'loading' : opencritic100 != null ? 'ready' : 'missing',
      url: opencriticUrl,
    },
    {
      key: 'backloggd',
      label: t.unifiedRatingBackloggd,
      display: backloggd5 != null ? formatUnifiedScore5(backloggd5) : null,
      score5: backloggd5,
      status: backloggd5 != null ? 'ready' : 'missing',
    },
  ].filter((p) => ocEnabled || p.key !== 'opencritic');

  const present = providers.filter((p) => p.status === 'ready');
  const externalPresent = present.filter((p) => p.key !== 'backloggd');
  const anyLoading = providers.some((p) => p.status === 'loading');

  // Hide when there are no scores outside Backloggd (solo Backloggd ≠ Plus rating).
  if (!externalPresent.length) {
    if (steamSettled && ocSettled) {
      row.style.display = 'none';
      return;
    }
    // Still waiting on sources — keep the loading tile visible.
    row.style.display = '';
  } else {
    row.style.display = '';
  }

  const hasAvg = present.length > 0 && externalPresent.length > 0;
  const avg5 = hasAvg ? present.reduce((s, p) => s + p.score5, 0) / present.length : null;
  const avg5Rounded = avg5 != null ? Math.round(avg5 * 10) / 10 : null;
  const grade =
    avg5Rounded == null ? 'mid' : avg5Rounded >= 4 ? 'high' : avg5Rounded >= 3 ? 'mid' : 'low';
  const barWidth = avg5Rounded != null ? Math.max(0, Math.min(100, (avg5Rounded / 5) * 100)) : 0;

  tile.classList.toggle('is-loading', anyLoading && !hasAvg);
  tile.setAttribute('data-grade', grade);

  const numEl = tile.querySelector('.blp-unified-rating__num');
  const denomEl = tile.querySelector('.blp-unified-rating__denom');
  const hintEl = tile.querySelector('.blp-unified-rating__hint');
  const meter = tile.querySelector('.blp-unified-rating__meter');
  const fill = tile.querySelector('.blp-unified-rating__meter-fill');

  if (hasAvg && avg5Rounded != null) {
    animateUnifiedRatingNum(numEl, avg5Rounded);
    if (denomEl) denomEl.textContent = t.unifiedRatingOutOf;
    if (hintEl) {
      hintEl.textContent = anyLoading
        ? t.unifiedRatingLoading
        : fmt(t.unifiedRatingSources, { n: present.length });
    }
    setUnifiedRatingMeter(meter, fill, barWidth, { indeterminate: false, avg5: avg5Rounded });
  } else {
    if (numEl) {
      numEl.classList.add('is-skel');
      numEl.classList.remove('is-pulse');
      delete numEl.dataset.blpNum;
      numEl.innerHTML = '<span class="blp-skeleton blp-unified-rating__skel-num"></span>';
    }
    if (denomEl) {
      denomEl.innerHTML = '<span class="blp-skeleton blp-unified-rating__skel-denom"></span>';
    }
    if (hintEl) hintEl.textContent = t.unifiedRatingLoading;
    setUnifiedRatingMeter(meter, fill, 0, { indeterminate: true });
  }

  for (const provider of providers) {
    const cell =
      tile.querySelector(`.blp-unified-rating__cell[data-blp-provider="${provider.key}"]`) ||
      null;
    paintUnifiedRatingCell(cell, provider);
  }
}
