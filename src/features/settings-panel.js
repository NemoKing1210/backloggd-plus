import {
  buildCacheMeterHtml,
  buildCacheTabBadgeHtml,
  clearCache,
  clearSteamOverride,
  getSteamOverride,
  paintCacheMeter,
  pruneDisabledCacheCategories,
  setSteamOverride,
} from '../cache.js';
import { CONVERT_CURRENCIES } from '../api/fx.js';
import {
  AUTHOR_AVATAR_URL,
  AUTHOR_BACKLOGGD_HANDLE,
  AUTHOR_BACKLOGGD_URL,
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
import {
  buildSettingsExport,
  linkLabelKey,
  parseSettingsImport,
  resetSettings,
  saveSettings,
  settingsExportFilename,
} from '../settings.js';
import { reloadRuntimeSettings, settings, t } from '../state.js';
import { escapeAttr, escapeHtml } from '../utils/html.js';
import { scheduleCardBadges } from './cards.js';
import { enrichGamePage, getPageContext, removeEnrichment } from './enrichment.js';
import { queueToast, showToast } from './toast.js';

const SETTINGS_TABS = [
  { id: 'general', labelKey: 'sectionGeneral' },
  { id: 'profile', labelKey: 'sectionProfile' },
  { id: 'game', labelKey: 'sectionGame' },
  { id: 'lists', labelKey: 'sectionLists' },
  { id: 'translate', labelKey: 'sectionTranslate' },
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

/**
 * Settings group: titled block with optional hint and one or more lists.
 * Use on every settings tab so spacing between groups stays consistent.
 */
function groupHtml(titleKey, hintKey, ...content) {
  const hint = hintKey
    ? `<p class="blp-settings__intro">${escapeHtml(t[hintKey])}</p>`
    : '';
  return `
    <section class="blp-settings-group">
      <header class="blp-settings-group__head">
        <h3>${escapeHtml(t[titleKey])}</h3>
        ${hint}
      </header>
      ${content.filter(Boolean).join('')}
    </section>
  `;
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

function backupActionHtml(action, titleKey, hintKey) {
  return `
    <div class="blp-settings-backup__item">
      <button type="button" class="blp-btn" data-blp-settings-${escapeAttr(action)}>
        ${escapeHtml(t[titleKey])}
      </button>
      <p class="blp-hint blp-settings-backup__hint">${escapeHtml(t[hintKey])}</p>
    </div>
  `;
}

function downloadJsonFile(filename, data) {
  const text = `${JSON.stringify(data, null, 2)}\n`;
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
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

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('read failed'));
    reader.readAsText(file);
  });
}

function settingsImportErrorMessage(code) {
  if (code === 'too_large') return t.toastSettingsImportTooLarge;
  if (code === 'empty') return t.toastSettingsImportEmpty;
  if (code === 'invalid_json' || code === 'not_settings') return t.toastSettingsImportInvalid;
  return t.toastSettingsImportReadFailed;
}

function normalizeTranslateLocale(code) {
  const raw = code || 'auto';
  return raw === 'auto' || SUPPORTED_LOCALES.includes(raw) ? raw : 'auto';
}

function buildTranslateTabBadgeHtml(code) {
  const localeCode = normalizeTranslateLocale(code);
  const label = localeCode.toUpperCase();
  const title =
    localeCode === 'auto' ? t.translateAsUi : LOCALE_NATIVE_NAMES[localeCode] || label;
  return `<span class="blp-settings__tab-badge blp-settings__tab-badge--low" data-blp-translate-tab-badge title="${escapeAttr(title)}" aria-label="${escapeAttr(title)}">${escapeHtml(label)}</span>`;
}

function paintTranslateTabBadge(root, code) {
  const badge = root?.querySelector?.('[data-blp-translate-tab-badge]');
  if (!badge) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = buildTranslateTabBadgeHtml(code).trim();
  const next = wrap.firstElementChild;
  if (next) badge.replaceWith(next);
}

const CACHE_SOURCE_KEYS = [
  'cacheGameData',
  'cacheUserProfiles',
  'cacheTranslations',
  'cacheFx',
];

/** Preview meter “off” badges from unsaved draft without committing settings. */
function previewCacheMeterFromDraft(root, draft) {
  const prev = {};
  for (const key of CACHE_SOURCE_KEYS) {
    prev[key] = settings[key];
    settings[key] = draft[key] !== false;
  }
  try {
    paintCacheMeter(root);
  } finally {
    for (const key of CACHE_SOURCE_KEYS) {
      settings[key] = prev[key];
    }
  }
}

function buildTabsHtml(activeId, draft) {
  const tabs = SETTINGS_TABS.map(({ id, labelKey }) => {
    const active = id === activeId;
    let badge = '';
    if (id === 'cache') badge = buildCacheTabBadgeHtml();
    else if (id === 'translate') {
      badge = buildTranslateTabBadgeHtml(draft?.translateTargetLocale || settings.translateTargetLocale);
    }
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

function aboutLinkHtml({ url, domain, label, hint }) {
  const icon = FAVICON_URL.replace('{domain}', encodeURIComponent(domain));
  return `
    <a
      class="blp-about__link"
      href="${escapeAttr(url)}"
      target="_blank"
      rel="noopener noreferrer"
    >
      <img class="blp-about__link-icon" src="${escapeAttr(icon)}" alt="" width="16" height="16" loading="lazy" decoding="async" />
      <span class="blp-about__link-text">
        <span class="blp-about__link-label">${escapeHtml(label)}</span>
        <span class="blp-about__link-hint">${escapeHtml(hint)}</span>
      </span>
    </a>
  `;
}

function buildAboutHtml() {
  const contributorsBlock = CONTRIBUTORS.length
    ? groupHtml(
        'aboutContributors',
        'aboutContributorsThanks',
        `
          <div class="blp-settings-list blp-settings-list--stack blp-about__people-card">
            <div class="blp-about__people">
              ${CONTRIBUTORS.map((person) => personCardHtml(person)).join('')}
            </div>
          </div>
        `
      )
    : '';

  return `
    ${groupHtml(
      'sectionAbout',
      null,
      `
        <div class="blp-settings-list blp-settings-list--stack blp-about__script">
          <p class="blp-about__desc">${escapeHtml(t.aboutDescription)}</p>
          <div class="blp-about__meta">
            <span class="blp-about__chip">v${escapeHtml(SCRIPT_VERSION)}</span>
            <span class="blp-about__chip">${escapeHtml(t.aboutLicense)}</span>
          </div>
          ${aboutLinkHtml({
            url: REPO_URL,
            domain: 'github.com',
            label: t.aboutRepo,
            hint: t.repoAbout,
          })}
          <p class="blp-about__note blp-about__note--contribute">${escapeHtml(t.aboutContributeBody)}</p>
        </div>
      `
    )}
    ${groupHtml(
      'aboutAuthor',
      null,
      `
        <div class="blp-settings-list blp-settings-list--stack blp-about__author">
          ${personCardHtml({
            name: AUTHOR_NAME,
            handle: AUTHOR_HANDLE,
            url: AUTHOR_URL,
            avatarUrl: AUTHOR_AVATAR_URL,
            email: AUTHOR_EMAIL,
          })}
          ${aboutLinkHtml({
            url: AUTHOR_BACKLOGGD_URL,
            domain: 'backloggd.com',
            label: t.aboutBackloggd,
            hint: fmt(t.aboutBackloggdHint, { user: AUTHOR_BACKLOGGD_HANDLE }),
          })}
          <p class="blp-about__note">${escapeHtml(t.aboutBackloggdNote)}</p>
        </div>
      `
    )}
    ${contributorsBlock}
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

function openConfirmDialog({ title, message, confirmLabel, danger = false, onConfirm }) {
  if (document.querySelector('.blp-confirm-backdrop')) return;

  const backdrop = document.createElement('div');
  backdrop.className = 'blp-confirm-backdrop';
  backdrop.innerHTML = `
    <div class="blp-confirm-dialog" role="dialog" aria-modal="true" aria-label="${escapeAttr(title)}">
      <h3>${escapeHtml(title)}</h3>
      <p class="blp-hint">${escapeHtml(message)}</p>
      <div class="blp-actions">
        <button type="button" class="blp-btn" data-blp-confirm-cancel>${escapeHtml(t.cancel)}</button>
        <button type="button" class="blp-btn ${danger ? 'blp-danger' : 'blp-primary'}" data-blp-confirm-ok>${escapeHtml(confirmLabel)}</button>
      </div>
    </div>
  `;

  const close = () => {
    document.removeEventListener('keydown', onKeydown, true);
    backdrop.remove();
  };

  const onKeydown = (e) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    close();
  };

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  backdrop.querySelector('[data-blp-confirm-cancel]')?.addEventListener('click', close);
  backdrop.querySelector('[data-blp-confirm-ok]')?.addEventListener('click', () => {
    close();
    onConfirm?.();
  });

  document.body.appendChild(backdrop);
  document.addEventListener('keydown', onKeydown, true);
  backdrop.querySelector('[data-blp-confirm-cancel]')?.focus();
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
        ${buildTabsHtml(activeTab, draft)}
      </div>
      <div class="blp-settings__body">
      <div ${panelAttrs('general', activeTab)}>
      ${groupHtml(
        'generalGroupLanguage',
        'generalGroupLanguageHint',
        listHtml(fieldHtml('blp-ui-locale', t.uiLanguage, localeSelect, t.uiLanguageHint))
      )}
      ${groupHtml(
        'generalGroupInterface',
        'generalGroupInterfaceHint',
        listHtml(
          toggleHtml('enhanceHeader', draft.enhanceHeader === true, 'enhanceHeaderHint'),
          toggleHtml('hideHomepageFuse', draft.hideHomepageFuse !== false, 'hideHomepageFuseHint'),
          toggleHtml(
            'showProfileMenuSettings',
            draft.showProfileMenuSettings === true,
            'showProfileMenuSettingsHint'
          )
        )
      )}
      ${groupHtml(
        'generalGroupBackup',
        'generalGroupBackupHint',
        `<div class="blp-settings-list blp-settings-list--stack">
          <div class="blp-settings-backup">
            ${backupActionHtml('export', 'settingsExport', 'settingsExportHint')}
            ${backupActionHtml('import', 'settingsImport', 'settingsImportHint')}
          </div>
          <input
            type="file"
            accept=".json,application/json,text/json"
            hidden
            data-blp-settings-import-file
          />
        </div>`
      )}
      </div>
      <div ${panelAttrs('profile', activeTab)}>
      ${groupHtml(
        'profileGroupHover',
        'profileGroupHoverHint',
        listHtml(
          toggleHtml(
            'showUserMiniProfile',
            draft.showUserMiniProfile !== false,
            'showUserMiniProfileHint'
          ),
          toggleHtml(
            'preloadUserMiniProfile',
            draft.preloadUserMiniProfile === true,
            'preloadUserMiniProfileHint'
          )
        )
      )}
      ${groupHtml(
        'profileGroupPage',
        'profileGroupPageHint',
        listHtml(
          toggleHtml('showProfilePage', draft.showProfilePage !== false, 'showProfilePageHint')
        )
      )}
      ${groupHtml(
        'profileGroupBlocks',
        'profileGroupBlocksHint',
        listHtml(
          toggleHtml(
            'showProfileHeader',
            draft.showProfileHeader !== false,
            'showProfileHeaderHint'
          ),
          toggleHtml(
            'showProfileTierChip',
            draft.showProfileTierChip !== false,
            'showProfileTierChipHint'
          ),
          toggleHtml(
            'showProfileStats',
            draft.showProfileStats !== false,
            'showProfileStatsHint'
          ),
          toggleHtml(
            'showProfileNav',
            draft.showProfileNav !== false,
            'showProfileNavHint'
          ),
          toggleHtml(
            'showProfileFavorites',
            draft.showProfileFavorites !== false,
            'showProfileFavoritesHint'
          )
        )
      )}
      </div>
      <div ${panelAttrs('game', activeTab)}>
      ${groupHtml(
        'gameGroupSteam',
        null,
        listHtml(fieldHtml('blp-steam-cc', t.steamCountry, steamCcSelect, t.steamCountryHint)),
        listHtml(
          toggleHtml('showPriceConvert', Boolean(draft.showPriceConvert), 'showPriceConvertHint'),
          fieldHtml('blp-convert-ccy', t.convertCurrency, convertCcySelect, t.convertCurrencyHint)
        ),
        listHtml(
          toggleHtml('showSteam', draft.showSteam),
          toggleHtml('showSteamOwned', draft.showSteamOwned, 'showSteamOwnedHint'),
          toggleHtml('showSteamWishlist', draft.showSteamWishlist, 'showSteamWishlistHint'),
          toggleHtml('showSteamTags', draft.showSteamTags, 'showSteamTagsHint'),
          toggleHtml('showSteamCategories', draft.showSteamCategories, 'showSteamCategoriesHint')
        )
      )}
      ${groupHtml(
        'gameGroupScores',
        null,
        listHtml(
          toggleHtml('showMetacritic', draft.showMetacritic),
          toggleHtml('showOpenCritic', draft.showOpenCritic, 'showOpenCriticHint'),
          toggleHtml('showHltb', draft.showHltb, 'showHltbHint')
        )
      )}
      ${groupHtml(
        'gameGroupCompat',
        null,
        listHtml(
          toggleHtml('showDeckProton', draft.showDeckProton, 'showDeckProtonHint'),
          toggleHtml('showGameStatus', draft.showGameStatus, 'showGameStatusHint'),
          toggleHtml('showSteamPlayers', draft.showSteamPlayers, 'showSteamPlayersHint'),
          toggleHtml('showSteamDbDetails', draft.showSteamDbDetails, 'showSteamDbDetailsHint')
        )
      )}
      ${groupHtml(
        'gameGroupMedia',
        null,
        listHtml(
          toggleHtml('showSteamDbIcon', draft.showSteamDbIcon, 'showSteamDbIconHint'),
          toggleHtml('showSteamDbCover', draft.showSteamDbCover, 'showSteamDbCoverHint'),
          toggleHtml('showSteamDbGallery', draft.showSteamDbGallery, 'showSteamDbGalleryHint'),
          toggleHtml('showSimilarGames', draft.showSimilarGames, 'showSimilarGamesHint'),
          toggleHtml('showGameStats', draft.showGameStats, 'showGameStatsHint')
        )
      )}
      ${groupHtml(
        'gameGroupTools',
        null,
        listHtml(
          toggleHtml('showExport', draft.showExport, 'showExportHint'),
          toggleHtml('showGameId', draft.showGameId, 'showGameIdHint')
        )
      )}
      ${groupHtml(
        'sectionLinks',
        'sectionLinksHint',
        listHtml(toggleHtml('showLinks', draft.showLinks), ...linkToggles)
      )}
      ${groupHtml(
        'gameGroupHosts',
        'gameGroupHostsHint',
        listHtml(
          toggleHtml('showSteamPageLink', draft.showSteamPageLink, 'showSteamPageLinkHint'),
          toggleHtml('showSteamDbPageLink', draft.showSteamDbPageLink, 'showSteamDbPageLinkHint')
        )
      )}
      </div>
      <div ${panelAttrs('lists', activeTab)}>
      ${groupHtml(
        'sectionLists',
        'sectionListsHint',
        listHtml(toggleHtml('showCardBadges', draft.showCardBadges, 'showCardBadgesHint'))
      )}
      ${groupHtml(
        'cardGroupTypes',
        'cardGroupTypesHint',
        listHtml(
          toggleHtml('showCardBadgePrice', draft.showCardBadgePrice, 'showCardBadgePriceHint'),
          toggleHtml('showCardBadgeReview', draft.showCardBadgeReview, 'showCardBadgeReviewHint'),
          toggleHtml('showCardBadgeOwned', draft.showCardBadgeOwned, 'showCardBadgeOwnedHint'),
          toggleHtml('showCardBadgeWishlist', draft.showCardBadgeWishlist, 'showCardBadgeWishlistHint'),
          toggleHtml(
            'showCardBadgeGameStatus',
            draft.showCardBadgeGameStatus,
            'showCardBadgeGameStatusHint'
          )
        )
      )}
      </div>
      <div ${panelAttrs('translate', activeTab)}>
      ${groupHtml(
        'sectionTranslate',
        null,
        listHtml(
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
        )
      )}
      </div>
      <div ${panelAttrs('cache', activeTab)}>
      ${groupHtml(
        'sectionCache',
        'sectionCacheHint',
        `<div class="blp-settings-list blp-settings-list--stack">
          ${buildCacheMeterHtml()}
        </div>`
      )}
      ${groupHtml(
        'sectionCacheDuration',
        null,
        `<div class="blp-settings-list blp-settings-list--stack">
          ${fieldHtml(
            'blp-cache-hours',
            t.cacheHours,
            `<input id="blp-cache-hours" type="number" min="0" max="${CACHE_HOURS_MAX}" value="${Number(draft.cacheHours) || 0}" />`,
            t.cacheHoursHint
          )}
        </div>`
      )}
      ${groupHtml(
        'sectionCacheSources',
        'sectionCacheSourcesHint',
        listHtml(
          toggleHtml('cacheGameData', draft.cacheGameData !== false, 'cacheGameDataHint'),
          toggleHtml(
            'cacheUserProfiles',
            draft.cacheUserProfiles !== false,
            'cacheUserProfilesHint'
          ),
          toggleHtml(
            'cacheTranslations',
            draft.cacheTranslations !== false,
            'cacheTranslationsHint'
          ),
          toggleHtml('cacheFx', draft.cacheFx !== false, 'cacheFxHint')
        )
      )}
      ${groupHtml(
        'sectionCacheClear',
        null,
        `<div class="blp-settings-list blp-settings-list--stack">
          <div class="blp-settings-list__actions">
            <button type="button" class="blp-btn" data-blp-clear>${escapeHtml(t.clearCache)}</button>
            <p class="blp-hint">${escapeHtml(t.cacheClearHint)}</p>
          </div>
        </div>`
      )}
      </div>
      <div ${panelAttrs('debug', activeTab)}>
      ${groupHtml(
        'sectionDebug',
        null,
        listHtml(toggleHtml('debugMode', draft.debugMode, 'debugModeHint'))
      )}
      </div>
      <div ${panelAttrs('about', activeTab)}>
      ${buildAboutHtml()}
      </div>
      </div>
      <div class="blp-settings__foot">
        <div class="blp-actions blp-actions--start">
          <button type="button" data-blp-reset>${escapeHtml(t.resetSettings)}</button>
        </div>
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
      if (document.querySelector('.blp-confirm-backdrop')) return;
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

  backdrop.querySelector('#blp-translate-locale')?.addEventListener('change', (e) => {
    paintTranslateTabBadge(backdrop, e.target?.value);
    syncTabInk(dialog);
  });

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
      if (
        key === 'cacheGameData' ||
        key === 'cacheUserProfiles' ||
        key === 'cacheTranslations' ||
        key === 'cacheFx'
      ) {
        previewCacheMeterFromDraft(backdrop, draft);
        syncTabInk(dialog);
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

  backdrop.querySelector('[data-blp-settings-export]')?.addEventListener('click', () => {
    try {
      // Prefer live draft so unsaved panel tweaks are included in the backup.
      const cc = backdrop.querySelector('#blp-steam-cc')?.value;
      const hours = Number(backdrop.querySelector('#blp-cache-hours')?.value);
      const uiLocale = backdrop.querySelector('#blp-ui-locale')?.value;
      const translateLocaleVal = backdrop.querySelector('#blp-translate-locale')?.value;
      const translateModeVal = backdrop.querySelector('#blp-translate-mode')?.value;
      const convertCcy = backdrop.querySelector('#blp-convert-ccy')?.value;
      const snapshot = {
        ...draft,
        links: { ...draft.links },
      };
      if (uiLocale != null) snapshot.uiLocale = uiLocale;
      if (translateLocaleVal != null) snapshot.translateTargetLocale = translateLocaleVal;
      if (translateModeVal != null) snapshot.translateDisplayMode = translateModeVal;
      if (cc != null) snapshot.steamCountry = cc;
      if (convertCcy != null) snapshot.convertCurrency = convertCcy;
      if (Number.isFinite(hours)) snapshot.cacheHours = hours;

      downloadJsonFile(settingsExportFilename(), buildSettingsExport(snapshot));
      showToast(t.toastSettingsExported, {
        type: 'success',
        title: t.toastSettingsExportedTitle,
      });
    } catch (_) {
      showToast(t.toastSettingsExportFailed, {
        type: 'error',
        title: t.toastSettingsExportFailedTitle,
      });
    }
  });

  const importFileInput = backdrop.querySelector('[data-blp-settings-import-file]');
  const applyImportedSettings = (parsed) => {
    saveSettings(parsed.settings);
    reloadRuntimeSettings();
    pruneDisabledCacheCategories();
    queueToast(t.toastSettingsImported, {
      type: 'success',
      title: t.toastSettingsImportedTitle,
    });
    location.reload();
  };

  const handleSettingsImportFile = async (file) => {
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const parsed = parseSettingsImport(text, file.size || 0);
      if (!parsed.ok) {
        showToast(settingsImportErrorMessage(parsed.code), {
          type: 'error',
          title: t.toastSettingsImportFailedTitle,
        });
        return;
      }
      openConfirmDialog({
        title: t.settingsImportConfirmTitle,
        message: t.settingsImportConfirm,
        confirmLabel: t.settingsImportConfirmAction,
        danger: true,
        onConfirm: () => applyImportedSettings(parsed),
      });
    } catch (_) {
      showToast(t.toastSettingsImportReadFailed, {
        type: 'error',
        title: t.toastSettingsImportFailedTitle,
      });
    }
  };

  backdrop.querySelector('[data-blp-settings-import]')?.addEventListener('click', () => {
    if (!importFileInput) return;
    importFileInput.value = '';
    importFileInput.click();
  });

  importFileInput?.addEventListener('change', () => {
    const file = importFileInput.files?.[0];
    void handleSettingsImportFile(file);
  });

  backdrop.querySelector('[data-blp-reset]')?.addEventListener('click', () => {
    openConfirmDialog({
      title: t.resetSettingsConfirmTitle,
      message: t.resetSettingsConfirm,
      confirmLabel: t.resetSettingsConfirmAction,
      danger: true,
      onConfirm: () => {
        resetSettings();
        reloadRuntimeSettings();
        queueToast(t.toastSettingsReset, {
          type: 'success',
          title: t.toastSettingsResetTitle,
        });
        location.reload();
      },
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
    draft.cacheGameData = draft.cacheGameData !== false;
    draft.cacheUserProfiles = draft.cacheUserProfiles !== false;
    draft.cacheTranslations = draft.cacheTranslations !== false;
    draft.cacheFx = draft.cacheFx !== false;
    saveSettings(draft);
    reloadRuntimeSettings();
    pruneDisabledCacheCategories();
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
export const PROFILE_MENU_SETTINGS_ID = 'blp-profile-menu-settings';

export function ensureProfileMenuSettingsLink() {
  const existing = document.getElementById(PROFILE_MENU_SETTINGS_ID);
  if (settings.showProfileMenuSettings !== true) {
    existing?.remove();
    return;
  }
  if (existing) return;

  const menu =
    document.querySelector('#profile-li .dropdown-menu') ||
    document.querySelector('#navbarDropdown + .dropdown-menu');
  if (!menu) return;

  const link = document.createElement('a');
  link.id = PROFILE_MENU_SETTINGS_ID;
  link.className = 'dropdown-item py-1';
  link.href = '#';
  link.textContent = t.navSettings;
  link.title = t.navSettingsTitle;
  link.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openSettings();
  });

  const nativeSettings = menu.querySelector(
    'a.dropdown-item[href="/settings/"], a.dropdown-item[href="/settings"]'
  );
  if (nativeSettings) {
    nativeSettings.insertAdjacentElement('beforebegin', link);
    return;
  }
  const logout = menu.querySelector(
    'a.dropdown-item[href="/users/sign_out"], a.dropdown-item[href="/users/sign_out/"]'
  );
  if (logout) {
    logout.insertAdjacentElement('beforebegin', link);
    return;
  }
  menu.appendChild(link);
}

export function ensureNavSettingsButton() {
  ensureProfileMenuSettingsLink();

  const existingBtn = document.getElementById(NAV_BTN_ID);
  if (settings.showProfileMenuSettings === true) {
    existingBtn?.remove();
    return;
  }
  if (existingBtn) return;

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
