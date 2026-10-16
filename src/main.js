import {
  GM_registerMenuCommand,
} from '$';
import './styles/main.css';
import './styles/unified-rating.css';
import './styles/user-mini-profile.css';
import './styles/game-mini-profile.css';
import { bindCachePersistFlush, migrateCacheForScriptVersion } from './cache.js';
import { ROOT_ATTR, SCRIPT_VERSION } from './constants.js';
import { applyAccentColor } from './features/accent.js';
import { ensureNavSettingsButton, openSettings } from './features/settings-panel.js';
import { startSiteLocale } from './features/site-locale.js';
import {
  bindSpaNavigation,
  isBackloggdHost,
  isSteamDbHost,
  isSteamHost,
  observeDom,
  scanPage,
} from './features/spa.js';
import { scanSteamPage } from './features/steam-page.js';
import { scanSteamDbPage } from './features/steamdb-page.js';
import { flushQueuedToasts, showToast } from './features/toast.js';
import { fmt } from './i18n/index.js';
import { reloadRuntimeSettings, t } from './state.js';

function init() {
  if (document.documentElement.hasAttribute(ROOT_ATTR)) return;
  document.documentElement.setAttribute(ROOT_ATTR, '1');

  reloadRuntimeSettings();
  applyAccentColor();
  bindCachePersistFlush();
  const migrate = migrateCacheForScriptVersion();
  flushQueuedToasts();
  if (migrate === 'upgrade') {
    showToast(fmt(t.toastCacheClearedOnUpdate, { version: SCRIPT_VERSION }), {
      type: 'info',
      title: t.toastCacheClearedOnUpdateTitle,
      duration: 5200,
    });
  }

  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand(t.menuSettings, openSettings);
  }

  if (isSteamHost()) {
    scanSteamPage();
    observeDom(scanSteamPage);
    return;
  }

  if (isSteamDbHost()) {
    scanSteamDbPage();
    observeDom(scanSteamDbPage);
    return;
  }

  if (isBackloggdHost()) {
    startSiteLocale();
    ensureNavSettingsButton();
    scanPage();
    observeDom(scanPage);
    bindSpaNavigation(scanPage);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
