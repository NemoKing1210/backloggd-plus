import {
  buildCacheMeterHtml,
  clearCache,
  clearSteamOverride,
  getSteamOverride,
  paintCacheMeter,
  setSteamOverride,
} from '../cache.js';
import {
  CACHE_HOURS_MAX,
  DEFAULT_SETTINGS,
  FAVICON_URL,
  LINK_DOMAINS,
  LINK_KEYS,
  REPO_URL,
  SCRIPT_VERSION,
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
  { id: 'game', labelKey: 'sectionGame' },
  { id: 'lists', labelKey: 'sectionLists' },
  { id: 'links', labelKey: 'sectionLinks' },
  { id: 'cache', labelKey: 'sectionCache' },
  { id: 'debug', labelKey: 'sectionDebug' },
];

function toggleHtml(key, on) {
  return `
    <div class="blp-toggle">
      <span>${escapeHtml(t[key])}</span>
      <button type="button" data-blp-toggle="${escapeAttr(key)}" class="${on ? 'is-on' : ''}">${on ? t.on : t.off}</button>
    </div>
  `;
}

function hintHtml(key) {
  return `<p class="blp-hint">${escapeHtml(t[key])}</p>`;
}

function buildTabsHtml(activeId) {
  return SETTINGS_TABS.map(({ id, labelKey }) => {
    const active = id === activeId;
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
      >${escapeHtml(t[labelKey])}</button>
    `;
  }).join('');
}

function panelAttrs(id, activeId) {
  const active = id === activeId;
  return `class="blp-settings__panel${active ? ' is-active' : ''}" id="blp-panel-${escapeAttr(id)}" role="tabpanel" aria-labelledby="blp-tab-${escapeAttr(id)}"${active ? '' : ' hidden'}`;
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
        <span class="blp-toggle__label">
          <img class="blp-favicon" src="${escapeAttr(icon)}" alt="" width="14" height="14" />
          ${escapeHtml(label)}
        </span>
        <button type="button" data-blp-link="${escapeAttr(key)}" class="${on ? 'is-on' : ''}">${on ? t.on : t.off}</button>
      </div>
    `;
  }).join('');

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
        <div class="blp-field">
          <label for="blp-ui-locale">${escapeHtml(t.uiLanguage)}</label>
          <select id="blp-ui-locale">
            <option value="auto" ${(draft.uiLocale || 'auto') === 'auto' ? 'selected' : ''}>${LOCALE_FLAG_AUTO} ${escapeHtml(t.uiLanguageAuto)}</option>
            ${SUPPORTED_LOCALES.map((code) => {
              const selected = draft.uiLocale === code ? 'selected' : '';
              const name = LOCALE_NATIVE_NAMES[code] || code;
              const flag = LOCALE_FLAGS[code] || '';
              return `<option value="${code}" ${selected}>${flag} ${escapeHtml(name)}</option>`;
            }).join('')}
          </select>
          <p class="blp-hint">${escapeHtml(t.uiLanguageHint)}</p>
        </div>
      </section>
      </div>
      <div ${panelAttrs('game', activeTab)}>
      <section>
        <h3>${escapeHtml(t.sectionGame)}</h3>
        <div class="blp-field">
          <label for="blp-steam-cc">${escapeHtml(t.steamCountry)}</label>
          <select id="blp-steam-cc">
            ${['US', 'GB', 'DE', 'FR', 'RU', 'BR', 'JP', 'KR', 'CN', 'AU', 'CA', 'PL', 'ES', 'IT', 'TR', 'UA']
              .map(
                (cc) =>
                  `<option value="${cc}" ${draft.steamCountry === cc ? 'selected' : ''}>${cc}</option>`
              )
              .join('')}
          </select>
          <p class="blp-hint">${escapeHtml(t.steamCountryHint)}</p>
        </div>
        ${toggleHtml('showSteam', draft.showSteam)}
        ${toggleHtml('showSteamOwned', draft.showSteamOwned)}
        ${hintHtml('showSteamOwnedHint')}
        ${toggleHtml('showSteamWishlist', draft.showSteamWishlist)}
        ${hintHtml('showSteamWishlistHint')}
        ${toggleHtml('showSteamTags', draft.showSteamTags)}
        ${hintHtml('showSteamTagsHint')}
        ${toggleHtml('showSteamCategories', draft.showSteamCategories)}
        ${hintHtml('showSteamCategoriesHint')}
        ${toggleHtml('showMetacritic', draft.showMetacritic)}
        ${toggleHtml('showOpenCritic', draft.showOpenCritic)}
        ${hintHtml('showOpenCriticHint')}
        ${toggleHtml('showHltb', draft.showHltb)}
        ${hintHtml('showHltbHint')}
        ${toggleHtml('showDeckProton', draft.showDeckProton)}
        ${hintHtml('showDeckProtonHint')}
        ${toggleHtml('showGameStatus', draft.showGameStatus)}
        ${hintHtml('showGameStatusHint')}
        ${toggleHtml('showLinks', draft.showLinks)}
        ${toggleHtml('showSteamPageLink', draft.showSteamPageLink)}
        ${hintHtml('showSteamPageLinkHint')}
        ${toggleHtml('showSteamDbPageLink', draft.showSteamDbPageLink)}
        ${hintHtml('showSteamDbPageLinkHint')}
        ${toggleHtml('showSteamDbIcon', draft.showSteamDbIcon)}
        ${hintHtml('showSteamDbIconHint')}
        ${toggleHtml('showSteamDbCover', draft.showSteamDbCover)}
        ${hintHtml('showSteamDbCoverHint')}
        ${toggleHtml('showSteamDbGallery', draft.showSteamDbGallery)}
        ${hintHtml('showSteamDbGalleryHint')}
        ${toggleHtml('showSimilarGames', draft.showSimilarGames)}
        ${hintHtml('showSimilarGamesHint')}
        ${toggleHtml('showGameStats', draft.showGameStats)}
        ${hintHtml('showGameStatsHint')}
        ${toggleHtml('showSteamPlayers', draft.showSteamPlayers)}
        ${hintHtml('showSteamPlayersHint')}
      </section>
      </div>
      <div ${panelAttrs('lists', activeTab)}>
      <section>
        <h3>${escapeHtml(t.sectionLists)}</h3>
        ${toggleHtml('showCardBadges', draft.showCardBadges)}
        ${hintHtml('showCardBadgesHint')}
      </section>
      </div>
      <div ${panelAttrs('links', activeTab)}>
      <section>
        <h3>${escapeHtml(t.sectionLinks)}</h3>
        <p class="blp-hint" style="margin-bottom:10px">${escapeHtml(t.sectionLinksHint)}</p>
        ${linkToggles}
      </section>
      </div>
      <div ${panelAttrs('cache', activeTab)}>
      <section>
        <h3>${escapeHtml(t.sectionCache)}</h3>
        ${buildCacheMeterHtml()}
        <div class="blp-field">
          <label for="blp-cache-hours">${escapeHtml(t.cacheHours)}</label>
          <input id="blp-cache-hours" type="number" min="0" max="${CACHE_HOURS_MAX}" value="${Number(draft.cacheHours) || 0}" />
          <p class="blp-hint">${escapeHtml(t.cacheHoursHint)}</p>
        </div>
        <button type="button" class="blp-btn" data-blp-clear>${escapeHtml(t.clearCache)}</button>
        <p class="blp-hint">${escapeHtml(t.cacheClearHint)}</p>
      </section>
      </div>
      <div ${panelAttrs('debug', activeTab)}>
      <section>
        <h3>${escapeHtml(t.sectionDebug)}</h3>
        ${toggleHtml('debugMode', draft.debugMode)}
        ${hintHtml('debugModeHint')}
      </section>
      </div>
      </div>
      <div class="blp-settings__foot">
        <div class="blp-actions">
          <button type="button" data-blp-cancel>${escapeHtml(t.cancel)}</button>
          <button type="button" class="blp-primary" data-blp-save>${escapeHtml(t.saveReload)}</button>
        </div>
        <div class="blp-settings__footer">
          <a href="${escapeAttr(REPO_URL)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t.repoLink)}</a>
          — ${escapeHtml(t.repoAbout)}
        </div>
      </div>
    </div>
  `;

  const prevOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';

  const close = () => {
    backdrop.remove();
    document.documentElement.style.overflow = prevOverflow;
  };
  const dialog = backdrop.querySelector('.blp-settings');

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

  backdrop.querySelectorAll('[data-blp-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-blp-toggle');
      draft[key] = !draft[key];
      btn.classList.toggle('is-on', draft[key]);
      btn.textContent = draft[key] ? t.on : t.off;
    });
  });

  backdrop.querySelectorAll('[data-blp-link]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-blp-link');
      draft.links[key] = !draft.links[key];
      btn.classList.toggle('is-on', draft.links[key]);
      btn.textContent = draft.links[key] ? t.on : t.off;
    });
  });

  backdrop.querySelector('[data-blp-clear]')?.addEventListener('click', () => {
    const count = clearCache();
    paintCacheMeter(backdrop);
    showToast(count ? fmt(t.cacheCleared, { count }) : t.cacheEmpty, {
      type: count ? 'success' : 'info',
    });
  });

  backdrop.querySelector('[data-blp-save]')?.addEventListener('click', () => {
    const cc = backdrop.querySelector('#blp-steam-cc')?.value || 'US';
    const hours = Number(backdrop.querySelector('#blp-cache-hours')?.value);
    const uiLocale = backdrop.querySelector('#blp-ui-locale')?.value || 'auto';
    draft.uiLocale =
      uiLocale === 'auto' || SUPPORTED_LOCALES.includes(uiLocale) ? uiLocale : 'auto';
    draft.steamCountry = String(cc).toUpperCase();
    draft.cacheHours = Number.isFinite(hours)
      ? Math.max(0, Math.min(CACHE_HOURS_MAX, hours))
      : DEFAULT_SETTINGS.cacheHours;
    saveSettings(draft);
    reloadRuntimeSettings();
    queueToast(t.toastSettingsSaved, { type: 'success' });
    location.reload();
  });

  document.body.appendChild(backdrop);
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
    showToast(t.toastSteamMatchCleared, { type: 'info' });
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
      showToast(t.steamFixMatchInvalid, { type: 'error' });
      return;
    }
    setSteamOverride(slug, id);
    close();
    removeEnrichment();
    enrichGamePage();
    scheduleCardBadges(true);
    showToast(fmt(t.toastSteamMatchSaved, { id }), { type: 'success' });
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
