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
import { LOCALE_NATIVE_NAMES, SUPPORTED_LOCALES, fmt } from '../i18n/index.js';
import { linkLabelKey, saveSettings } from '../settings.js';
import { reloadRuntimeSettings, settings, t } from '../state.js';
import { escapeAttr, escapeHtml } from '../utils/html.js';
import { scheduleCardBadges } from './cards.js';
import { enrichGamePage, getPageContext, removeEnrichment } from './enrichment.js';

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

  const backdrop = document.createElement('div');
  backdrop.className = 'blp-settings-backdrop';
  backdrop.innerHTML = `
    <div class="blp-settings" role="dialog" aria-modal="true" aria-label="${escapeAttr(t.panelTitle)}">
      <div class="blp-settings__head">
        <h2>${escapeHtml(t.panelTitle)} <span class="blp-settings__ver">v${escapeHtml(SCRIPT_VERSION)}</span></h2>
        <p class="blp-settings__sub">${escapeHtml(t.panelSubtitle)}</p>
      </div>
      <div class="blp-settings__body">
      <section>
        <h3>${escapeHtml(t.sectionGeneral)}</h3>
        <div class="blp-field">
          <label for="blp-ui-locale">${escapeHtml(t.uiLanguage)}</label>
          <select id="blp-ui-locale">
            <option value="auto" ${(draft.uiLocale || 'auto') === 'auto' ? 'selected' : ''}>${escapeHtml(t.uiLanguageAuto)}</option>
            ${SUPPORTED_LOCALES.map((code) => {
              const selected = draft.uiLocale === code ? 'selected' : '';
              const name = LOCALE_NATIVE_NAMES[code] || code;
              return `<option value="${code}" ${selected}>${escapeHtml(name)}</option>`;
            }).join('')}
          </select>
          <p class="blp-hint">${escapeHtml(t.uiLanguageHint)}</p>
        </div>
      </section>
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
        <div class="blp-toggle">
          <span>${escapeHtml(t.showSteam)}</span>
          <button type="button" data-blp-toggle="showSteam" class="${draft.showSteam ? 'is-on' : ''}">${draft.showSteam ? t.on : t.off}</button>
        </div>
        <div class="blp-toggle">
          <span>${escapeHtml(t.showSteamOwned)}</span>
          <button type="button" data-blp-toggle="showSteamOwned" class="${draft.showSteamOwned ? 'is-on' : ''}">${draft.showSteamOwned ? t.on : t.off}</button>
        </div>
        <p class="blp-hint">${escapeHtml(t.showSteamOwnedHint)}</p>
        <div class="blp-toggle">
          <span>${escapeHtml(t.showSteamWishlist)}</span>
          <button type="button" data-blp-toggle="showSteamWishlist" class="${draft.showSteamWishlist ? 'is-on' : ''}">${draft.showSteamWishlist ? t.on : t.off}</button>
        </div>
        <p class="blp-hint">${escapeHtml(t.showSteamWishlistHint)}</p>
        <div class="blp-toggle">
          <span>${escapeHtml(t.showSteamTags)}</span>
          <button type="button" data-blp-toggle="showSteamTags" class="${draft.showSteamTags ? 'is-on' : ''}">${draft.showSteamTags ? t.on : t.off}</button>
        </div>
        <p class="blp-hint">${escapeHtml(t.showSteamTagsHint)}</p>
        <div class="blp-toggle">
          <span>${escapeHtml(t.showSteamCategories)}</span>
          <button type="button" data-blp-toggle="showSteamCategories" class="${draft.showSteamCategories ? 'is-on' : ''}">${draft.showSteamCategories ? t.on : t.off}</button>
        </div>
        <p class="blp-hint">${escapeHtml(t.showSteamCategoriesHint)}</p>
        <div class="blp-toggle">
          <span>${escapeHtml(t.showMetacritic)}</span>
          <button type="button" data-blp-toggle="showMetacritic" class="${draft.showMetacritic ? 'is-on' : ''}">${draft.showMetacritic ? t.on : t.off}</button>
        </div>
        <div class="blp-toggle">
          <span>${escapeHtml(t.showOpenCritic)}</span>
          <button type="button" data-blp-toggle="showOpenCritic" class="${draft.showOpenCritic ? 'is-on' : ''}">${draft.showOpenCritic ? t.on : t.off}</button>
        </div>
        <p class="blp-hint">${escapeHtml(t.showOpenCriticHint)}</p>
        <div class="blp-toggle">
          <span>${escapeHtml(t.showHltb)}</span>
          <button type="button" data-blp-toggle="showHltb" class="${draft.showHltb ? 'is-on' : ''}">${draft.showHltb ? t.on : t.off}</button>
        </div>
        <p class="blp-hint">${escapeHtml(t.showHltbHint)}</p>
        <div class="blp-toggle">
          <span>${escapeHtml(t.showDeckProton)}</span>
          <button type="button" data-blp-toggle="showDeckProton" class="${draft.showDeckProton ? 'is-on' : ''}">${draft.showDeckProton ? t.on : t.off}</button>
        </div>
        <p class="blp-hint">${escapeHtml(t.showDeckProtonHint)}</p>
        <div class="blp-toggle">
          <span>${escapeHtml(t.showGameStatus)}</span>
          <button type="button" data-blp-toggle="showGameStatus" class="${draft.showGameStatus ? 'is-on' : ''}">${draft.showGameStatus ? t.on : t.off}</button>
        </div>
        <p class="blp-hint">${escapeHtml(t.showGameStatusHint)}</p>
        <div class="blp-toggle">
          <span>${escapeHtml(t.showLinks)}</span>
          <button type="button" data-blp-toggle="showLinks" class="${draft.showLinks ? 'is-on' : ''}">${draft.showLinks ? t.on : t.off}</button>
        </div>
        <div class="blp-toggle">
          <span>${escapeHtml(t.showSteamPageLink)}</span>
          <button type="button" data-blp-toggle="showSteamPageLink" class="${draft.showSteamPageLink ? 'is-on' : ''}">${draft.showSteamPageLink ? t.on : t.off}</button>
        </div>
        <p class="blp-hint">${escapeHtml(t.showSteamPageLinkHint)}</p>
        <div class="blp-toggle">
          <span>${escapeHtml(t.showSteamDbPageLink)}</span>
          <button type="button" data-blp-toggle="showSteamDbPageLink" class="${draft.showSteamDbPageLink ? 'is-on' : ''}">${draft.showSteamDbPageLink ? t.on : t.off}</button>
        </div>
        <p class="blp-hint">${escapeHtml(t.showSteamDbPageLinkHint)}</p>
        <div class="blp-toggle">
          <span>${escapeHtml(t.showSteamDbIcon)}</span>
          <button type="button" data-blp-toggle="showSteamDbIcon" class="${draft.showSteamDbIcon ? 'is-on' : ''}">${draft.showSteamDbIcon ? t.on : t.off}</button>
        </div>
        <p class="blp-hint">${escapeHtml(t.showSteamDbIconHint)}</p>
        <div class="blp-toggle">
          <span>${escapeHtml(t.showSteamDbCover)}</span>
          <button type="button" data-blp-toggle="showSteamDbCover" class="${draft.showSteamDbCover ? 'is-on' : ''}">${draft.showSteamDbCover ? t.on : t.off}</button>
        </div>
        <p class="blp-hint">${escapeHtml(t.showSteamDbCoverHint)}</p>
        <div class="blp-toggle">
          <span>${escapeHtml(t.showSteamDbGallery)}</span>
          <button type="button" data-blp-toggle="showSteamDbGallery" class="${draft.showSteamDbGallery ? 'is-on' : ''}">${draft.showSteamDbGallery ? t.on : t.off}</button>
        </div>
        <p class="blp-hint">${escapeHtml(t.showSteamDbGalleryHint)}</p>
        <div class="blp-toggle">
          <span>${escapeHtml(t.showSimilarGames)}</span>
          <button type="button" data-blp-toggle="showSimilarGames" class="${draft.showSimilarGames ? 'is-on' : ''}">${draft.showSimilarGames ? t.on : t.off}</button>
        </div>
        <p class="blp-hint">${escapeHtml(t.showSimilarGamesHint)}</p>
        <div class="blp-toggle">
          <span>${escapeHtml(t.showGameStats)}</span>
          <button type="button" data-blp-toggle="showGameStats" class="${draft.showGameStats ? 'is-on' : ''}">${draft.showGameStats ? t.on : t.off}</button>
        </div>
        <p class="blp-hint">${escapeHtml(t.showGameStatsHint)}</p>
        <div class="blp-toggle">
          <span>${escapeHtml(t.showSteamPlayers)}</span>
          <button type="button" data-blp-toggle="showSteamPlayers" class="${draft.showSteamPlayers ? 'is-on' : ''}">${draft.showSteamPlayers ? t.on : t.off}</button>
        </div>
        <p class="blp-hint">${escapeHtml(t.showSteamPlayersHint)}</p>
      </section>
      <section>
        <h3>${escapeHtml(t.sectionLists)}</h3>
        <div class="blp-toggle">
          <span>${escapeHtml(t.showCardBadges)}</span>
          <button type="button" data-blp-toggle="showCardBadges" class="${draft.showCardBadges ? 'is-on' : ''}">${draft.showCardBadges ? t.on : t.off}</button>
        </div>
        <p class="blp-hint">${escapeHtml(t.showCardBadgesHint)}</p>
      </section>
      <section>
        <h3>${escapeHtml(t.sectionLinks)}</h3>
        <p class="blp-hint" style="margin-bottom:10px">${escapeHtml(t.sectionLinksHint)}</p>
        ${linkToggles}
      </section>
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
        <div class="blp-cache-msg" data-blp-cache-msg hidden></div>
      </section>
      <section>
        <h3>${escapeHtml(t.sectionDebug)}</h3>
        <div class="blp-toggle">
          <span>${escapeHtml(t.debugMode)}</span>
          <button type="button" data-blp-toggle="debugMode" class="${draft.debugMode ? 'is-on' : ''}">${draft.debugMode ? t.on : t.off}</button>
        </div>
        <p class="blp-hint">${escapeHtml(t.debugModeHint)}</p>
      </section>
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

  const close = () => backdrop.remove();

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  backdrop.querySelector('[data-blp-cancel]')?.addEventListener('click', close);

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
    const msg = backdrop.querySelector('[data-blp-cache-msg]');
    if (msg) {
      msg.hidden = false;
      msg.textContent = count
        ? fmt(t.cacheCleared, { count })
        : t.cacheEmpty;
    }
    paintCacheMeter(backdrop);
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
      return;
    }
    setSteamOverride(slug, id);
    close();
    removeEnrichment();
    enrichGamePage();
    scheduleCardBadges(true);
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
