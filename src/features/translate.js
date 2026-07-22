import { unsafeWindow } from '$';
import { translateText } from '../api/google-translate.js';
import { SUPPORTED_LOCALES } from '../i18n/index.js';
import { locale, settings, t } from '../state.js';
import { escapeHtml } from '../utils/html.js';

const BTN_CLASS = 'blp-translate-btn';
const RESULT_CLASS = 'blp-translate-result';
const MARK_ATTR = 'data-blp-translate';
const STATE_ATTR = 'data-blp-translate-state';
const ORIG_ATTR = 'data-blp-translate-original';
const AUTO_ATTR = 'data-blp-translate-auto';
const AUTO_ROOT_MARGIN = '120px 0px';
const AUTO_CONCURRENCY = 2;

let clicksBound = false;
let autoObserver = null;
let autoActive = 0;
const autoQueue = [];

function resolveTranslateTarget() {
  const pref = settings.translateTargetLocale || 'auto';
  if (pref !== 'auto' && SUPPORTED_LOCALES.includes(pref)) return pref;
  return locale;
}

function displayMode() {
  return settings.translateDisplayMode === 'below' ? 'below' : 'replace';
}

function htmlToPlain(html) {
  const div = document.createElement('div');
  div.innerHTML = String(html || '');
  div.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
  return (div.textContent || '').replace(/\u00a0/g, ' ').trim();
}

function plainToHtml(text) {
  return escapeHtml(String(text || '')).replace(/\r\n|\r|\n/g, '<br>');
}

function findDescriptionTextEl() {
  const summary = document.querySelector('#collapseSummary');
  if (!summary) return null;
  return summary.querySelector('p') || summary;
}

function findReviewTextEl(card) {
  return (
    card.querySelector('.review-body .card-text') ||
    card.querySelector('.review-body [id^="collapseReview"]') ||
    card.querySelector('.card-text')
  );
}

function reviewButton(card) {
  return card?.querySelector?.(`.${BTN_CLASS}[data-blp-translate-kind="review"]`) || null;
}

function removeTranslateUi(scope = document) {
  stopAutoTranslate();
  scope.querySelectorAll('.blp-translate-desc-slot, .blp-translate-review-slot').forEach((el) => {
    el.remove();
  });
  scope.querySelectorAll(`.${BTN_CLASS}`).forEach((el) => el.remove());
  scope.querySelectorAll(`.${RESULT_CLASS}`).forEach((el) => el.remove());
  scope.querySelectorAll(`[${MARK_ATTR}]`).forEach((el) => {
    el.removeAttribute(MARK_ATTR);
  });
  scope.querySelectorAll(`[${AUTO_ATTR}]`).forEach((el) => {
    el.removeAttribute(AUTO_ATTR);
  });
  scope.querySelectorAll(`[${ORIG_ATTR}]`).forEach((el) => {
    const orig = el.getAttribute(ORIG_ATTR);
    if (orig != null) el.innerHTML = orig;
    el.removeAttribute(ORIG_ATTR);
    el.removeAttribute(STATE_ATTR);
  });
}

function setButtonLabel(btn, kind) {
  if (!btn) return;
  if (kind === 'loading') {
    btn.innerHTML = `<span class="blp-translate-btn__spin" aria-hidden="true"></span><span class="blp-translate-btn__label">${escapeHtml(t.translateLoading)}</span>`;
    btn.setAttribute('aria-busy', 'true');
    btn.classList.add('is-loading');
    return;
  }
  btn.removeAttribute('aria-busy');
  btn.classList.remove('is-loading');

  let label = t.translateButton;
  if (kind === 'original') label = t.translateShowOriginal;
  else if (kind === 'hide') label = t.translateHide;
  else if (kind === 'error') label = t.translateError;

  btn.innerHTML = `<span class="blp-translate-btn__label">${escapeHtml(label)}</span>`;
}

function makeButton(kind) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `${BTN_CLASS} ${BTN_CLASS}--chip${kind === 'desc' ? ` ${BTN_CLASS}--desc` : ` ${BTN_CLASS}--review`}`;
  btn.setAttribute('data-blp-translate-kind', kind);
  setButtonLabel(btn, 'idle');
  return btn;
}

function ensureDescriptionButton() {
  if (!settings.translateDescription) {
    document.querySelectorAll('.blp-translate-desc-slot').forEach((el) => el.remove());
    document.querySelectorAll(`.${BTN_CLASS}[data-blp-translate-kind="desc"]`).forEach((el) => {
      el.remove();
    });
    const textEl = findDescriptionTextEl();
    if (textEl?.hasAttribute(ORIG_ATTR)) {
      textEl.innerHTML = textEl.getAttribute(ORIG_ATTR);
      textEl.removeAttribute(ORIG_ATTR);
    }
    document.querySelector('#collapseSummary')?.removeAttribute(MARK_ATTR);
    document.querySelectorAll(`.${RESULT_CLASS}`).forEach((el) => {
      if (el.closest('#center-content, #collapseSummary, #game-body')) {
        const inReview = el.closest('.review-card');
        if (!inReview) el.remove();
      }
    });
    return;
  }

  const textEl = findDescriptionTextEl();
  const summary = document.querySelector('#collapseSummary');
  if (!textEl || !summary) return;
  if (!htmlToPlain(textEl.innerHTML)) return;

  summary.setAttribute(MARK_ATTR, 'desc');

  let btn = document.querySelector(`.${BTN_CLASS}[data-blp-translate-kind="desc"]`);
  if (btn) return;

  btn = makeButton('desc');
  const expand = document.getElementById('summary-expand-btn');
  const slot = expand?.closest('.col-auto');
  if (slot) {
    const wrap = document.createElement('div');
    wrap.className = 'col-auto my-auto blp-translate-desc-slot';
    wrap.appendChild(btn);
    slot.insertAdjacentElement('beforebegin', wrap);
    return;
  }
  textEl.insertAdjacentElement('afterend', btn);
}

function ensureReviewButton(card) {
  if (card.querySelector(`.${BTN_CLASS}[data-blp-translate-kind="review"]`)) return;
  const textEl = findReviewTextEl(card);
  if (!textEl || !htmlToPlain(textEl.innerHTML)) return;

  card.setAttribute(MARK_ATTR, 'review');
  const btn = makeButton('review');
  const bar = card.querySelector('.review-bottom-bar');
  if (bar) {
    const col = document.createElement('div');
    col.className = 'col-auto my-auto pr-1 blp-translate-review-slot';
    col.appendChild(btn);
    const expand = bar.querySelector('.expand-review-col');
    if (expand) expand.insertAdjacentElement('beforebegin', col);
    else bar.appendChild(col);
    return;
  }
  textEl.insertAdjacentElement('afterend', btn);
}

function syncReviewButtons() {
  if (!settings.translateReviews) {
    document.querySelectorAll(`.${BTN_CLASS}[data-blp-translate-kind="review"]`).forEach((el) => {
      el.closest('.blp-translate-review-slot')?.remove();
      el.remove();
    });
    document.querySelectorAll(`.review-card[${MARK_ATTR}="review"]`).forEach((el) => {
      el.removeAttribute(MARK_ATTR);
    });
    return;
  }
  document.querySelectorAll('.review-card').forEach((card) => ensureReviewButton(card));
}

function getTargetForButton(btn) {
  const kind = btn.getAttribute('data-blp-translate-kind');
  if (kind === 'desc') {
    const textEl = findDescriptionTextEl();
    return textEl ? { textEl, host: textEl.parentElement || textEl } : null;
  }
  const card = btn.closest('.review-card');
  if (!card) return null;
  const textEl = findReviewTextEl(card);
  return textEl ? { textEl, host: textEl.parentElement || textEl, card } : null;
}

/** Expand Bootstrap-collapsed review body when Translate is pressed. */
function expandCollapsedReview(textEl, card) {
  if (!textEl) return;

  const scope =
    card ||
    textEl.closest('.review-card') ||
    textEl.closest('.review-body')?.parentElement ||
    document;

  const id = textEl.id || '';
  const toggleCandidates = [];
  if (id) {
    const byHref = scope.querySelector(`a.review-more[href="#${id}"]`);
    const byControls = scope.querySelector(`a.review-more[aria-controls="${id}"]`);
    if (byHref) toggleCandidates.push(byHref);
    if (byControls && byControls !== byHref) toggleCandidates.push(byControls);
  }
  const byCol = scope.querySelector('.expand-review-col a.review-more, a.review-more');
  if (byCol && !toggleCandidates.includes(byCol)) toggleCandidates.push(byCol);

  const toggle = toggleCandidates[0] || null;
  const isCollapsed =
    (textEl.classList.contains('collapse') && !textEl.classList.contains('show')) ||
    toggle?.getAttribute('aria-expanded') === 'false' ||
    toggle?.classList?.contains('collapsed');

  if (!isCollapsed) return;

  try {
    const pageWindow = unsafeWindow || window;
    const $ = pageWindow?.jQuery || pageWindow?.$;
    if ($?.fn?.collapse) {
      $(textEl).collapse('show');
    }
  } catch (_) {
    /* fall through to DOM force */
  }

  textEl.classList.remove('collapsing');
  textEl.classList.add('collapse', 'show');
  textEl.style.display = 'block';
  textEl.style.height = 'auto';
  textEl.style.maxHeight = 'none';
  textEl.style.overflow = 'visible';
  textEl.style.visibility = 'visible';

  let clip = textEl.parentElement;
  for (let i = 0; i < 3 && clip; i++) {
    if (clip.classList?.contains('position-relative') || clip.classList?.contains('col')) {
      clip.style.maxHeight = 'none';
      clip.style.overflow = 'visible';
    }
    clip = clip.parentElement;
  }

  toggleCandidates.forEach((el) => {
    el.classList.remove('collapsed');
    el.setAttribute('aria-expanded', 'true');
  });
}

function clearBelowResult(host, textEl) {
  const reviewCard = textEl?.closest?.('.review-card');
  if (reviewCard) {
    reviewCard.querySelectorAll(`.${RESULT_CLASS}`).forEach((el) => el.remove());
    return;
  }
  host?.querySelectorAll?.(`.${RESULT_CLASS}`).forEach((el) => el.remove());
  const wrap = textEl?.closest?.('.position-relative') || textEl?.parentElement || host;
  wrap?.querySelectorAll?.(`.${RESULT_CLASS}`).forEach((el) => el.remove());
  const next = wrap?.nextElementSibling;
  if (next?.classList?.contains(RESULT_CLASS)) next.remove();
}

function mountBelowResult(textEl, host, translatedHtml, isReview) {
  clearBelowResult(host, textEl);
  const box = document.createElement('div');
  box.className = isReview ? `${RESULT_CLASS} ${RESULT_CLASS}--card` : RESULT_CLASS;

  if (isReview) {
    box.innerHTML = `
      <div class="blp-translate-result__head">${escapeHtml(t.translateResultLabel)}</div>
      <div class="blp-translate-result__body">${translatedHtml}</div>
    `;
    const reviewBody = textEl.closest('.review-body');
    if (reviewBody) {
      reviewBody.insertAdjacentElement('afterend', box);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => box.classList.add('is-in'));
      });
      return box;
    }
  } else {
    box.innerHTML = translatedHtml;
  }

  const wrap = textEl.closest('.position-relative') || textEl.parentElement || host;
  if (wrap && wrap !== textEl) wrap.appendChild(box);
  else textEl.insertAdjacentElement('afterend', box);
  if (isReview) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => box.classList.add('is-in'));
    });
  }
  return box;
}

/**
 * @returns {Promise<'ok' | 'same' | 'error' | 'skip'>}
 */
async function applyTranslation({ textEl, host, card, btn, isReview, expand = true }) {
  if (!textEl) return 'skip';
  if (btn?.getAttribute(STATE_ATTR) === 'translated') return 'skip';
  if (textEl.hasAttribute(ORIG_ATTR) && displayMode() === 'replace') return 'skip';
  if (isReview && card?.querySelector?.(`.${RESULT_CLASS}`)) return 'skip';

  if (isReview && expand) expandCollapsedReview(textEl, card);

  const sourceHtml =
    textEl.hasAttribute(ORIG_ATTR) ? textEl.getAttribute(ORIG_ATTR) : textEl.innerHTML;
  const plain = htmlToPlain(sourceHtml);
  if (!plain) return 'skip';

  const tl = resolveTranslateTarget();
  setButtonLabel(btn, 'loading');

  const result = await translateText(plain, tl);
  if (!result?.text) {
    setButtonLabel(btn, 'error');
    if (btn) setTimeout(() => setButtonLabel(btn, 'idle'), 1800);
    return 'error';
  }

  const detected = String(result.detectedSourceLang || '')
    .toLowerCase()
    .slice(0, 2);
  if (detected && detected === tl && result.text.trim() === plain) {
    if (btn) btn.style.display = 'none';
    setButtonLabel(btn, 'idle');
    return 'same';
  }

  const translatedHtml = plainToHtml(result.text);
  const mode = displayMode();
  if (isReview && expand) expandCollapsedReview(textEl, card);

  if (mode === 'below') {
    mountBelowResult(textEl, host, translatedHtml, isReview);
    if (btn) {
      btn.setAttribute(STATE_ATTR, 'translated');
      setButtonLabel(btn, 'hide');
    }
    return 'ok';
  }

  if (!textEl.hasAttribute(ORIG_ATTR)) {
    textEl.setAttribute(ORIG_ATTR, sourceHtml);
  }
  textEl.innerHTML = translatedHtml;
  if (isReview && expand) expandCollapsedReview(textEl, card);
  if (btn) {
    btn.setAttribute(STATE_ATTR, 'translated');
    setButtonLabel(btn, 'original');
  }
  return 'ok';
}

async function onTranslateClick(e) {
  const btn = e.target?.closest?.(`.${BTN_CLASS}`);
  if (!btn || btn.classList.contains('is-loading')) return;
  e.preventDefault();
  e.stopPropagation();

  const target = getTargetForButton(btn);
  if (!target) return;
  const { textEl, host, card } = target;
  const mode = displayMode();
  const state = btn.getAttribute(STATE_ATTR) || 'idle';
  const isReview = btn.getAttribute('data-blp-translate-kind') === 'review';

  if (mode === 'replace' && state === 'translated') {
    const orig = textEl.getAttribute(ORIG_ATTR);
    if (orig != null) textEl.innerHTML = orig;
    textEl.removeAttribute(ORIG_ATTR);
    btn.removeAttribute(STATE_ATTR);
    setButtonLabel(btn, 'idle');
    return;
  }

  if (mode === 'below' && state === 'translated') {
    clearBelowResult(host, textEl);
    btn.removeAttribute(STATE_ATTR);
    setButtonLabel(btn, 'idle');
    return;
  }

  await applyTranslation({ textEl, host, card, btn, isReview });
}

function ensureTranslateClicks() {
  if (clicksBound) return;
  clicksBound = true;
  document.addEventListener('click', onTranslateClick, true);
}

function stopAutoTranslate() {
  if (autoObserver) {
    autoObserver.disconnect();
    autoObserver = null;
  }
  autoQueue.length = 0;
  autoActive = 0;
}

function pumpAutoQueue() {
  while (autoActive < AUTO_CONCURRENCY && autoQueue.length) {
    const card = autoQueue.shift();
    if (!card?.isConnected) continue;
    if (card.getAttribute(AUTO_ATTR) === 'done' || card.getAttribute(AUTO_ATTR) === 'busy') {
      continue;
    }
    autoActive += 1;
    card.setAttribute(AUTO_ATTR, 'busy');
    const textEl = findReviewTextEl(card);
    const btn = reviewButton(card);
    const host = textEl?.parentElement || textEl;
    Promise.resolve()
      .then(() =>
        applyTranslation({
          textEl,
          host,
          card,
          btn,
          isReview: true,
          expand: false,
        })
      )
      .then((status) => {
        if (status === 'ok' || status === 'same') card.setAttribute(AUTO_ATTR, 'done');
        else card.removeAttribute(AUTO_ATTR);
      })
      .catch(() => {
        card.removeAttribute(AUTO_ATTR);
      })
      .finally(() => {
        autoActive -= 1;
        pumpAutoQueue();
      });
  }
}

function enqueueAutoTranslate(card) {
  if (!card || card.getAttribute(AUTO_ATTR) === 'done' || card.getAttribute(AUTO_ATTR) === 'busy') {
    return;
  }
  if (autoQueue.includes(card)) return;
  autoQueue.push(card);
  pumpAutoQueue();
}

function syncAutoTranslate() {
  const enabled =
    settings.showTranslate !== false &&
    settings.translateReviews !== false &&
    settings.translateReviewsAuto === true;

  if (!enabled) {
    stopAutoTranslate();
    document.querySelectorAll(`.review-card[${AUTO_ATTR}="busy"]`).forEach((el) => {
      el.removeAttribute(AUTO_ATTR);
    });
    return;
  }

  if (!autoObserver) {
    autoObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const card = entry.target;
          autoObserver?.unobserve(card);
          enqueueAutoTranslate(card);
        }
      },
      { root: null, rootMargin: AUTO_ROOT_MARGIN, threshold: 0.15 }
    );
  }

  document.querySelectorAll('.review-card').forEach((card) => {
    if (card.getAttribute(AUTO_ATTR) === 'done' || card.getAttribute(AUTO_ATTR) === 'busy') {
      return;
    }
    const textEl = findReviewTextEl(card);
    if (!textEl || !htmlToPlain(textEl.innerHTML)) return;
    autoObserver.observe(card);
  });
}

export function syncTranslateUi() {
  ensureTranslateClicks();

  if (settings.showTranslate === false) {
    removeTranslateUi();
    return;
  }

  ensureDescriptionButton();
  syncReviewButtons();
  syncAutoTranslate();
}
