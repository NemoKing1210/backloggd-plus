import {
  GM_registerMenuCommand,
} from '$';
import './styles/main.css';
import './styles/unified-rating.css';
import { migrateCacheForScriptVersion } from './cache.js';
import { ROOT_ATTR, SCRIPT_VERSION } from './constants.js';
import { ensureNavSettingsButton, openSettings } from './features/settings-panel.js';
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
  const migrate = migrateCacheForScriptVersion();
  flushQueuedToasts();
  if (migrate === 'upgrade') {
    showToast(fmt(t.toastCacheClearedOnUpdate, { version: SCRIPT_VERSION }), {
      type: 'info',
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
