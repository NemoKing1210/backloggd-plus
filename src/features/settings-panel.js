import {
  buildCacheMeterHtml,
  buildCacheTabBadgeHtml,
  clearCache,
  clearSteamOverride,
  getSteamOverride,
  paintCacheMeter,
  setSteamOverride,
} from '../cache.js';
import { CONVERT_CURRENCIES } from '../api/fx.js';
import {
  AUTHOR_AVATAR_URL,
  AUTHOR_EMAIL,
  AUTHOR_HANDLE,
  AUTHOR_NAME,
  AUTHOR_URL,
  CACHE_HOURS_MAX,
  CONTRIBUTORS,
  DEFAULT_SETTINGS,
  FAVICON_URL,
  LINK_DOMAINS,
  LINK_KEYS,
  REPO_URL,
  SCRIPT_VERSION,
  STEAM_COUNTRY_CODES,
} from '../constants.js';
import { LOCALE_FLAG_AUTO, LOCALE_FLAGS, LOCALE_NATIVE_NAMES, SUPPORTED_LOCALES, fmt } from '../i18n/index.js';
import { linkLabelKey, saveSettings } from '../settings.js';
import { reloadRuntimeSettings, settings, t } from '../state.js';
import { escapeAttr, escapeHtml } from '../utils/html.js';
import { scheduleCardBadges } from './cards.js';
import { enrichGamePage, getPageContext, removeEnrichment } from './enrichment.js';
import { queueToast, showToast } from './toast.js';

const SETTINGS_TABS = [
  { id: 'general', labelKey: 'sectionGeneral' },
  { id: 'ui', labelKey: 'sectionUi' },
  { id: 'game', labelKey: 'sectionGame' },
  { id: 'lists', labelKey: 'sectionLists' },
  { id: 'translate', labelKey: 'sectionTranslate' },
  { id: 'links', labelKey: 'sectionLinks' },
  { id: 'cache', labelKey: 'sectionCache' },
  { id: 'debug', labelKey: 'sectionDebug' },
  { id: 'about', labelKey: 'sectionAbout' },
];

function switchHtml(attrs, on) {
  return `
    <button
      type="button"
      role="switch"
      aria-checked="${on ? 'true' : 'false'}"
      class="blp-switch${on ? ' is-on' : ''}"
      ${attrs}
    ><span class="blp-switch__thumb" aria-hidden="true"></span></button>
  `;
}

function toggleHtml(key, on, hintKey) {
  const hint = hintKey
    ? `<span class="blp-toggle__hint">${escapeHtml(t[hintKey])}</span>`
    : '';
  return `
    <div class="blp-toggle">
      <span class="blp-toggle__text">
        <span class="blp-toggle__label">${escapeHtml(t[key])}</span>
        ${hint}
      </span>
      ${switchHtml(`data-blp-toggle="${escapeAttr(key)}"`, on)}
    </div>
  `;
}

function listHtml(...rows) {
  return `<div class="blp-settings-list">${rows.filter(Boolean).join('')}</div>`;
}

function fieldHtml(id, label, controlHtml, hint) {
  return `
    <div class="blp-field">
      <label for="${escapeAttr(id)}">${escapeHtml(label)}</label>
      ${controlHtml}
      ${hint ? `<p class="blp-hint">${escapeHtml(hint)}</p>` : ''}
    </div>
  `;
}

function buildTabsHtml(activeId) {
  const tabs = SETTINGS_TABS.map(({ id, labelKey }) => {
    const active = id === activeId;
    const badge = id === 'cache' ? buildCacheTabBadgeHtml() : '';
    return `
      <button
        type="button"
        class="blp-settings__tab${active ? ' is-active' : ''}"
        role="tab"
        id="blp-tab-${escapeAttr(id)}"
        data-blp-tab="${escapeAttr(id)}"
        aria-selected="${active ? 'true' : 'false'}"
        aria-controls="blp-panel-${escapeAttr(id)}"
        tabindex="${active ? '0' : '-1'}"
      ><span class="blp-settings__tab-label">${escapeHtml(t[labelKey])}</span>${badge}</button>
    `;
  }).join('');
  return `<span class="blp-settings__tab-ink" aria-hidden="true"></span>${tabs}`;
}

function panelAttrs(id, activeId) {
  const active = id === activeId;
  return `class="blp-settings__panel${active ? ' is-active' : ''}" id="blp-panel-${escapeAttr(id)}" role="tabpanel" aria-labelledby="blp-tab-${escapeAttr(id)}"${active ? '' : ' hidden'}`;
}

function personCardHtml({ name, handle, url, avatarUrl, email }) {
  const emailHtml = email
    ? `<a class="blp-about__email" href="mailto:${escapeAttr(email)}">${escapeHtml(email)}</a>`
    : '';
  return `
    <div class="blp-about__author-row">
      <a
        class="blp-about__avatar-link"
        href="${escapeAttr(url)}"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="${escapeAttr(name)}"
      >
        <img
          class="blp-about__avatar"
          src="${escapeAttr(avatarUrl)}"
          alt=""
          width="56"
          height="56"
          loading="lazy"
          decoding="async"
        />
      </a>
      <div class="blp-about__author-info">
        <a
          class="blp-about__name"
          href="${escapeAttr(url)}"
          target="_blank"
          rel="noopener noreferrer"
        >${escapeHtml(name)}</a>
        <span class="blp-about__handle">@${escapeHtml(handle)}</span>
        ${emailHtml}
      </div>
    </div>
  `;
}

function buildAboutHtml() {
  const githubFav = FAVICON_URL.replace('{domain}', 'github.com');
  const contributorsHtml = CONTRIBUTORS.length
    ? `
      <div class="blp-settings-list blp-settings-list--stack blp-about__contributors">
        <p class="blp-about__author-label">${escapeHtml(t.aboutContributors)}</p>
        <div class="blp-about__people">
          ${CONTRIBUTORS.map((person) => personCardHtml(person)).join('')}
        </div>
      </div>
    `
    : '';
  return `
    <div class="blp-about">
      <div class="blp-settings-list blp-settings-list--stack blp-about__script">
        <p class="blp-about__desc">${escapeHtml(t.aboutDescription)}</p>
        <div class="blp-about__meta">
          <span class="blp-about__chip">v${escapeHtml(SCRIPT_VERSION)}</span>
          <span class="blp-about__chip">${escapeHtml(t.aboutLicense)}</span>
        </div>
        <a
          class="blp-about__repo"
          href="${escapeAttr(REPO_URL)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img class="blp-about__repo-icon" src="${escapeAttr(githubFav)}" alt="" width="16" height="16" loading="lazy" decoding="async" />
          <span class="blp-about__repo-text">
            <span class="blp-about__repo-label">${escapeHtml(t.aboutRepo)}</span>
            <span class="blp-about__repo-hint">${escapeHtml(t.repoAbout)}</span>
          </span>
        </a>
      </div>
      <div class="blp-settings-list blp-settings-list--stack blp-about__author">
        <p class="blp-about__author-label">${escapeHtml(t.aboutAuthor)}</p>
        ${personCardHtml({
          name: AUTHOR_NAME,
          handle: AUTHOR_HANDLE,
          url: AUTHOR_URL,
          avatarUrl: AUTHOR_AVATAR_URL,
          email: AUTHOR_EMAIL,
        })}
      </div>
      ${contributorsHtml}
    </div>
  `;
}

function syncTabInk(root) {
  const tabs = root.querySelector('.blp-settings__tabs');
  const ink = root.querySelector('.blp-settings__tab-ink');
  const active = root.querySelector('.blp-settings__tab.is-active');
  if (!tabs || !ink || !active) return;
  ink.style.width = `${active.offsetWidth}px`;
  ink.style.transform = `translateX(${active.offsetLeft}px)`;
}

function setSwitchOn(btn, on) {
  btn.classList.toggle('is-on', on);
  btn.setAttribute('aria-checked', on ? 'true' : 'false');
}

function activateSettingsTab(root, tabId) {
  if (!SETTINGS_TABS.some((tab) => tab.id === tabId)) return;
  root.querySelectorAll('[data-blp-tab]').forEach((btn) => {
    const on = btn.getAttribute('data-blp-tab') === tabId;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
    btn.tabIndex = on ? 0 : -1;
  });
  root.querySelectorAll('[role="tabpanel"]').forEach((panel) => {
    const on = panel.id === `blp-panel-${tabId}`;
    panel.classList.toggle('is-active', on);
    panel.hidden = !on;
  });
  syncTabInk(root);
  root.querySelector('.blp-settings__tabs')?.querySelector('.blp-settings__tab.is-active')?.scrollIntoView({
    inline: 'nearest',
    block: 'nearest',
    behavior: 'smooth',
  });
}

export function openSettings() {
  if (document.querySelector('.blp-settings-backdrop')) return;

  const draft = {
    ...settings,
    links: { ...DEFAULT_SETTINGS.links, ...(settings.links || {}) },
  };
  const linkToggles = LINK_KEYS.map((key) => {
    const on = draft.links[key] !== false;
    const label = t[linkLabelKey(key)] || key;
    const domain = LINK_DOMAINS[key] || key;
    const icon = FAVICON_URL.replace('{domain}', encodeURIComponent(domain));
    return `
      <div class="blp-toggle">
        <span class="blp-toggle__text">
          <span class="blp-toggle__label">
            <img class="blp-favicon" src="${escapeAttr(icon)}" alt="" width="14" height="14" />
            ${escapeHtml(label)}
          </span>
        </span>
        ${switchHtml(`data-blp-link="${escapeAttr(key)}"`, on)}
      </div>
    `;
  });

  const localeSelect = `
    <select id="blp-ui-locale">
      <option value="auto" ${(draft.uiLocale || 'auto') === 'auto' ? 'selected' : ''}>${LOCALE_FLAG_AUTO} ${escapeHtml(t.uiLanguageAuto)}</option>
      ${SUPPORTED_LOCALES.map((code) => {
        const selected = draft.uiLocale === code ? 'selected' : '';
        const name = LOCALE_NATIVE_NAMES[code] || code;
        const flag = LOCALE_FLAGS[code] || '';
        return `<option value="${code}" ${selected}>${flag} ${escapeHtml(name)}</option>`;
      }).join('')}
    </select>
  `;

  const steamCcSelect = `
    <select id="blp-steam-cc">
      ${STEAM_COUNTRY_CODES.map(
        (cc) =>
          `<option value="${cc}" ${draft.steamCountry === cc ? 'selected' : ''}>${cc}</option>`
      ).join('')}
    </select>
  `;

  const convertCcySelect = `
    <select id="blp-convert-ccy" ${draft.showPriceConvert ? '' : 'disabled'}>
      ${CONVERT_CURRENCIES.map(
        (ccy) =>
          `<option value="${ccy}" ${
            (draft.convertCurrency || 'RUB') === ccy ? 'selected' : ''
          }>${ccy}</option>`
      ).join('')}
    </select>
  `;

  const translateLocale = draft.translateTargetLocale || 'auto';
  const translateLocaleSelect = `
    <select id="blp-translate-locale">
      <option value="auto" ${translateLocale === 'auto' ? 'selected' : ''}>${LOCALE_FLAG_AUTO} ${escapeHtml(t.translateAsUi)}</option>
      ${SUPPORTED_LOCALES.map((code) => {
        const selected = translateLocale === code ? 'selected' : '';
        const name = LOCALE_NATIVE_NAMES[code] || code;
        const flag = LOCALE_FLAGS[code] || '';
        return `<option value="${code}" ${selected}>${flag} ${escapeHtml(name)}</option>`;
      }).join('')}
    </select>
  `;

  const translateMode = draft.translateDisplayMode === 'below' ? 'below' : 'replace';
  const translateModeSelect = `
    <select id="blp-translate-mode">
      <option value="replace" ${translateMode === 'replace' ? 'selected' : ''}>${escapeHtml(t.translateModeReplace)}</option>
      <option value="below" ${translateMode === 'below' ? 'selected' : ''}>${escapeHtml(t.translateModeBelow)}</option>
    </select>
  `;

  const activeTab = 'general';
  const backdrop = document.createElement('div');
  backdrop.className = 'blp-settings-backdrop';
  backdrop.innerHTML = `
    <div class="blp-settings" role="dialog" aria-modal="true" aria-label="${escapeAttr(t.panelTitle)}">
      <div class="blp-settings__head">
        <h2>${escapeHtml(t.panelTitle)} <span class="blp-settings__ver">v${escapeHtml(SCRIPT_VERSION)}</span></h2>
        <p class="blp-settings__sub">${escapeHtml(t.panelSubtitle)}</p>
      </div>
      <div class="blp-settings__tabs" role="tablist" aria-label="${escapeAttr(t.panelTitle)}">
        ${buildTabsHtml(activeTab)}
      </div>
      <div class="blp-settings__body">
      <div ${panelAttrs('general', activeTab)}>
      <section>
        <h3>${escapeHtml(t.sectionGeneral)}</h3>
        ${listHtml(fieldHtml('blp-ui-locale', t.uiLanguage, localeSelect, t.uiLanguageHint))}
      </section>
      </div>
      <div ${panelAttrs('ui', activeTab)}>
      <section>
        <h3>${escapeHtml(t.sectionUi)}</h3>
        ${listHtml(
          toggleHtml('enhanceHeader', draft.enhanceHeader === true, 'enhanceHeaderHint'),
          toggleHtml('hideHomepageFuse', draft.hideHomepageFuse === true, 'hideHomepageFuseHint'),
          toggleHtml(
            'showUserMiniProfile',
            draft.showUserMiniProfile !== false,
            'showUserMiniProfileHint'
          )
        )}
      </section>
      </div>
      <div ${panelAttrs('game', activeTab)}>
      <section>
        <h3>${escapeHtml(t.sectionGame)}</h3>
        ${listHtml(fieldHtml('blp-steam-cc', t.steamCountry, steamCcSelect, t.steamCountryHint))}
        ${listHtml(
          toggleHtml('showPriceConvert', Boolean(draft.showPriceConvert), 'showPriceConvertHint'),
          fieldHtml('blp-convert-ccy', t.convertCurrency, convertCcySelect, t.convertCurrencyHint)
        )}
        ${listHtml(
          toggleHtml('showSteam', draft.showSteam),
          toggleHtml('showSteamOwned', draft.showSteamOwned, 'showSteamOwnedHint'),
          toggleHtml('showSteamWishlist', draft.showSteamWishlist, 'showSteamWishlistHint'),
          toggleHtml('showSteamTags', draft.showSteamTags, 'showSteamTagsHint'),
          toggleHtml('showSteamCategories', draft.showSteamCategories, 'showSteamCategoriesHint'),
          toggleHtml('showMetacritic', draft.showMetacritic),
          toggleHtml('showOpenCritic', draft.showOpenCritic, 'showOpenCriticHint'),
          toggleHtml('showHltb', draft.showHltb, 'showHltbHint'),
          toggleHtml('showDeckProton', draft.showDeckProton, 'showDeckProtonHint'),
          toggleHtml('showGameStatus', draft.showGameStatus, 'showGameStatusHint'),
          toggleHtml('showLinks', draft.showLinks),
          toggleHtml('showSteamPageLink', draft.showSteamPageLink, 'showSteamPageLinkHint'),
          toggleHtml('showSteamDbPageLink', draft.showSteamDbPageLink, 'showSteamDbPageLinkHint'),
          toggleHtml('showSteamDbIcon', draft.showSteamDbIcon, 'showSteamDbIconHint'),
          toggleHtml('showSteamDbCover', draft.showSteamDbCover, 'showSteamDbCoverHint'),
          toggleHtml('showSteamDbGallery', draft.showSteamDbGallery, 'showSteamDbGalleryHint'),
          toggleHtml('showSimilarGames', draft.showSimilarGames, 'showSimilarGamesHint'),
          toggleHtml('showGameStats', draft.showGameStats, 'showGameStatsHint'),
          toggleHtml('showSteamPlayers', draft.showSteamPlayers, 'showSteamPlayersHint'),
          toggleHtml('showSteamDbDetails', draft.showSteamDbDetails, 'showSteamDbDetailsHint'),
          toggleHtml('showExport', draft.showExport, 'showExportHint'),
          toggleHtml('showGameId', draft.showGameId, 'showGameIdHint')
        )}
      </section>
      </div>
      <div ${panelAttrs('lists', activeTab)}>
      <section>
        <h3>${escapeHtml(t.sectionLists)}</h3>
        ${listHtml(
          toggleHtml('showCardBadges', draft.showCardBadges, 'showCardBadgesHint'),
          toggleHtml('showCardBadgePrice', draft.showCardBadgePrice),
          toggleHtml('showCardBadgeReview', draft.showCardBadgeReview),
          toggleHtml('showCardBadgeOwned', draft.showCardBadgeOwned),
          toggleHtml('showCardBadgeWishlist', draft.showCardBadgeWishlist),
          toggleHtml('showCardBadgeGameStatus', draft.showCardBadgeGameStatus)
        )}
      </section>
      </div>
      <div ${panelAttrs('translate', activeTab)}>
      <section>
        <h3>${escapeHtml(t.sectionTranslate)}</h3>
        ${listHtml(
          toggleHtml('showTranslate', draft.showTranslate !== false, 'showTranslateHint'),
          fieldHtml(
            'blp-translate-locale',
            t.translateTargetLocale,
            translateLocaleSelect,
            t.translateTargetLocaleHint
          ),
          fieldHtml(
            'blp-translate-mode',
            t.translateDisplayMode,
            translateModeSelect,
            t.translateDisplayModeHint
          ),
          toggleHtml(
            'translateDescription',
            draft.translateDescription !== false,
            'translateDescriptionHint'
          ),
          toggleHtml('translateReviews', draft.translateReviews !== false, 'translateReviewsHint'),
          toggleHtml(
            'translateReviewsAuto',
            draft.translateReviewsAuto === true,
            'translateReviewsAutoHint'
          )
        )}
      </section>
      </div>
      <div ${panelAttrs('links', activeTab)}>
      <section>
        <h3>${escapeHtml(t.sectionLinks)}</h3>
        <p class="blp-settings__intro">${escapeHtml(t.sectionLinksHint)}</p>
        ${listHtml(...linkToggles)}
      </section>
      </div>
      <div ${panelAttrs('cache', activeTab)}>
      <section>
        <h3>${escapeHtml(t.sectionCache)}</h3>
        <div class="blp-settings-list blp-settings-list--stack">
          ${buildCacheMeterHtml()}
          ${fieldHtml(
            'blp-cache-hours',
            t.cacheHours,
            `<input id="blp-cache-hours" type="number" min="0" max="${CACHE_HOURS_MAX}" value="${Number(draft.cacheHours) || 0}" />`,
            t.cacheHoursHint
          )}
          <div class="blp-settings-list__actions">
            <button type="button" class="blp-btn" data-blp-clear>${escapeHtml(t.clearCache)}</button>
            <p class="blp-hint">${escapeHtml(t.cacheClearHint)}</p>
          </div>
        </div>
      </section>
      </div>
      <div ${panelAttrs('debug', activeTab)}>
      <section>
        <h3>${escapeHtml(t.sectionDebug)}</h3>
        ${listHtml(toggleHtml('debugMode', draft.debugMode, 'debugModeHint'))}
      </section>
      </div>
      <div ${panelAttrs('about', activeTab)}>
      <section>
        <h3>${escapeHtml(t.sectionAbout)}</h3>
        ${buildAboutHtml()}
      </section>
      </div>
      </div>
      <div class="blp-settings__foot">
        <div class="blp-actions">
          <button type="button" data-blp-cancel>${escapeHtml(t.cancel)}</button>
          <button type="button" class="blp-primary" data-blp-save>${escapeHtml(t.saveReload)}</button>
        </div>
      </div>
    </div>
  `;

  const prevOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';

  const close = () => {
    if (backdrop.dataset.blpClosing === '1') return;
    backdrop.dataset.blpClosing = '1';
    backdrop.classList.remove('is-open');
    document.removeEventListener('keydown', onKeydown, true);
    window.removeEventListener('resize', onResize);
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      backdrop.remove();
      document.documentElement.style.overflow = prevOverflow;
    };
    backdrop.addEventListener('transitionend', done, { once: true });
    setTimeout(done, 240);
  };
  const dialog = backdrop.querySelector('.blp-settings');

  const onKeydown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };

  const onResize = () => syncTabInk(dialog);
  window.addEventListener('resize', onResize);

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  backdrop.querySelector('[data-blp-cancel]')?.addEventListener('click', close);

  dialog?.querySelector('.blp-settings__tabs')?.addEventListener('click', (e) => {
    const btn = e.target?.closest?.('[data-blp-tab]');
    if (!btn || !dialog.contains(btn)) return;
    activateSettingsTab(dialog, btn.getAttribute('data-blp-tab'));
  });

  dialog?.querySelector('.blp-settings__tabs')?.addEventListener('keydown', (e) => {
    const tabs = [...dialog.querySelectorAll('[data-blp-tab]')];
    const current = e.target?.closest?.('[data-blp-tab]');
    if (!current || !tabs.length) return;
    const idx = tabs.indexOf(current);
    if (idx < 0) return;
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % tabs.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const tabId = tabs[next].getAttribute('data-blp-tab');
    activateSettingsTab(dialog, tabId);
    tabs[next].focus();
  });

  dialog?.querySelector('.blp-settings__tabs')?.addEventListener(
    'scroll',
    () => syncTabInk(dialog),
    { passive: true }
  );

  backdrop.querySelectorAll('[data-blp-toggle]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const key = btn.getAttribute('data-blp-toggle');
      draft[key] = !draft[key];
      setSwitchOn(btn, draft[key]);
      if (key === 'showPriceConvert') {
        const sel = backdrop.querySelector('#blp-convert-ccy');
        if (sel) sel.disabled = !draft.showPriceConvert;
      }
    });
  });

  backdrop.querySelectorAll('[data-blp-link]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const key = btn.getAttribute('data-blp-link');
      draft.links[key] = !draft.links[key];
      setSwitchOn(btn, draft.links[key]);
    });
  });

  backdrop.querySelectorAll('.blp-toggle').forEach((row) => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.blp-switch, a, select, input, button')) return;
      row.querySelector('.blp-switch')?.click();
    });
  });

  backdrop.querySelector('[data-blp-clear]')?.addEventListener('click', () => {
    const count = clearCache();
    paintCacheMeter(backdrop);
    syncTabInk(dialog);
    showToast(count ? fmt(t.cacheCleared, { count }) : t.cacheEmpty, {
      type: count ? 'success' : 'info',
      title: count ? t.toastCacheClearedTitle : t.cacheEmptyTitle,
    });
  });

  backdrop.querySelector('[data-blp-save]')?.addEventListener('click', () => {
    const cc = backdrop.querySelector('#blp-steam-cc')?.value || 'US';
    const hours = Number(backdrop.querySelector('#blp-cache-hours')?.value);
    const uiLocale = backdrop.querySelector('#blp-ui-locale')?.value || 'auto';
    draft.uiLocale =
      uiLocale === 'auto' || SUPPORTED_LOCALES.includes(uiLocale) ? uiLocale : 'auto';
    const translateLocaleVal = backdrop.querySelector('#blp-translate-locale')?.value || 'auto';
    draft.translateTargetLocale =
      translateLocaleVal === 'auto' || SUPPORTED_LOCALES.includes(translateLocaleVal)
        ? translateLocaleVal
        : 'auto';
    const translateModeVal = backdrop.querySelector('#blp-translate-mode')?.value || 'replace';
    draft.translateDisplayMode = translateModeVal === 'below' ? 'below' : 'replace';
    draft.steamCountry = String(cc).toUpperCase();
    const convertCcy = backdrop.querySelector('#blp-convert-ccy')?.value || 'RUB';
    draft.convertCurrency = String(convertCcy).toUpperCase();
    draft.showPriceConvert = Boolean(draft.showPriceConvert);
    draft.cacheHours = Number.isFinite(hours)
      ? Math.max(0, Math.min(CACHE_HOURS_MAX, hours))
      : DEFAULT_SETTINGS.cacheHours;
    saveSettings(draft);
    reloadRuntimeSettings();
    queueToast(t.toastSettingsSaved, {
      type: 'success',
      title: t.toastSettingsSavedTitle,
    });
    location.reload();
  });

  document.body.appendChild(backdrop);
  document.addEventListener('keydown', onKeydown, true);
  requestAnimationFrame(() => {
    backdrop.classList.add('is-open');
    syncTabInk(dialog);
  });
}

export const NAV_BTN_ID = 'blp-nav-settings';

export function ensureNavSettingsButton() {
  if (document.getElementById(NAV_BTN_ID)) return;

  const btn = document.createElement('button');
  btn.id = NAV_BTN_ID;
  btn.type = 'button';
  btn.className = 'btn btn-main mb-2 my-sm-0 py-0';
  btn.title = t.navSettingsTitle;
  // fa-gear is in Backloggd’s FA set (fa-sliders often is not → empty icon + short button)
  btn.innerHTML = `<i class="fa-solid fa-gear fa-xs" aria-hidden="true"></i> ${escapeHtml(t.navSettings)}`;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    openSettings();
  });

  // Same slot as native #add-a-game ("Log a Game")
  const logGame = document.getElementById('add-a-game');
  if (logGame?.parentElement) {
    btn.classList.add('ml-2');
    const h = logGame.getBoundingClientRect().height;
    if (h > 0) document.documentElement.style.setProperty('--blp-nav-btn-h', `${Math.round(h)}px`);
    logGame.insertAdjacentElement('afterend', btn);
    return;
  }

  const logSlot = document.querySelector(
    '#navbarSupportedContent .col.my-auto, #primary-nav .col.my-auto'
  );
  if (logSlot) {
    btn.classList.add('ml-2');
    logSlot.appendChild(btn);
    return;
  }

  const nav =
    document.querySelector('#navbarSupportedContent > ul.navbar-nav') ||
    document.querySelector('#primary-nav ul.navbar-nav.ml-auto');
  if (!nav) return;

  const li = document.createElement('li');
  li.className = 'nav-item my-auto';
  li.appendChild(btn);
  nav.appendChild(li);
}

export function openFixMatchDialog(slug, currentAppId) {
  if (!slug || document.querySelector('.blp-fix-match-backdrop')) return;

  const backdrop = document.createElement('div');
  backdrop.className = 'blp-fix-match-backdrop';
  backdrop.innerHTML = `
    <div class="blp-fix-match-dialog" role="dialog" aria-modal="true" aria-label="${escapeAttr(t.steamFixMatchTitle)}">
      <h3>${escapeHtml(t.steamFixMatchTitle)}</h3>
      <p class="blp-hint">${escapeHtml(t.steamFixMatchHint)}</p>
      <div class="blp-error" data-blp-fix-error hidden></div>
      <input id="blp-fix-appid" type="text" inputmode="numeric" placeholder="${escapeAttr(t.steamFixMatchPlaceholder)}" value="${escapeAttr(currentAppId || getSteamOverride(slug) || '')}" />
      <div class="blp-actions">
        <button type="button" class="blp-btn" data-blp-fix-clear>${escapeHtml(t.steamFixMatchClear)}</button>
        <button type="button" class="blp-btn" data-blp-fix-cancel>${escapeHtml(t.cancel)}</button>
        <button type="button" class="blp-btn blp-primary" data-blp-fix-save>${escapeHtml(t.save)}</button>
      </div>
    </div>
  `;

  const close = () => backdrop.remove();
  const errEl = () => backdrop.querySelector('[data-blp-fix-error]');
  const input = () => backdrop.querySelector('#blp-fix-appid');

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  backdrop.querySelector('[data-blp-fix-cancel]')?.addEventListener('click', close);
  backdrop.querySelector('[data-blp-fix-clear]')?.addEventListener('click', () => {
    clearSteamOverride(slug);
    close();
    removeEnrichment();
    enrichGamePage();
    scheduleCardBadges(true);
    showToast(t.toastSteamMatchCleared, {
      type: 'info',
      title: t.toastSteamMatchClearedTitle,
    });
  });
  backdrop.querySelector('[data-blp-fix-save]')?.addEventListener('click', () => {
    const raw = String(input()?.value || '').trim();
    const id = Number(raw.replace(/[^\d]/g, ''));
    if (!Number.isFinite(id) || id <= 0) {
      const box = errEl();
      if (box) {
        box.hidden = false;
        box.textContent = t.steamFixMatchInvalid;
      }
      showToast(t.steamFixMatchInvalid, {
        type: 'error',
        title: t.steamFixMatchInvalidTitle,
      });
      return;
    }
    setSteamOverride(slug, id);
    close();
    removeEnrichment();
    enrichGamePage();
    scheduleCardBadges(true);
    showToast(fmt(t.toastSteamMatchSaved, { id }), {
      type: 'success',
      title: t.toastSteamMatchSavedTitle,
    });
  });

  document.body.appendChild(backdrop);
  input()?.focus();
  input()?.select();
}

export function bindFixMatchClicks() {
  if (document.documentElement.hasAttribute('data-blp-fix-bound')) return;
  document.documentElement.setAttribute('data-blp-fix-bound', '1');
  document.addEventListener(
    'click',
    (e) => {
      const btn = e.target?.closest?.('[data-blp-fix-match]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      openFixMatchDialog(
        btn.getAttribute('data-blp-slug') || getPageContext().slug,
        btn.getAttribute('data-blp-appid') || ''
      );
    },
    true
  );
}
