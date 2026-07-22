import {
  CARD_ATTR,
  CARD_STATE_ATTR,
  ENRICH_ATTR,
  SCAN_DEBOUNCE_MS,
  SIMILAR_ATTR,
  STEAMDB_ATTR,
} from '../constants.js';
import { debounce } from '../utils/debounce.js';
import { scheduleCardBadges } from './cards.js';
import { enrichGamePage } from './enrichment.js';
import { applyHomepageFuseVisibility } from './homepage.js';
import { applyFloatingHeader } from './header.js';
import { bindFixMatchClicks, ensureNavSettingsButton } from './settings-panel.js';
import { bindLogEditorExportObserver, ensureLogEditorExportMount } from './export-game.js';
import { scheduleUserMiniProfiles } from './user-mini-profile.js';
import { scheduleProfilePage } from './profile-page.js';
import { syncTranslateUi } from './translate.js';

export function scanPage() {
  ensureNavSettingsButton();
  bindFixMatchClicks();
  bindLogEditorExportObserver();
  ensureLogEditorExportMount();
  applyHomepageFuseVisibility();
  applyFloatingHeader();
  enrichGamePage();
  scheduleCardBadges();
  scheduleUserMiniProfiles();
  scheduleProfilePage();
  syncTranslateUi();
}

export function isBlpManagedElement(el) {
  if (!el || el.nodeType !== 1) return false;
  if (
    el.hasAttribute?.(ENRICH_ATTR) ||
    el.hasAttribute?.(STEAMDB_ATTR) ||
    el.hasAttribute?.(SIMILAR_ATTR) ||
    el.hasAttribute?.(CARD_ATTR) ||
    el.hasAttribute?.(CARD_STATE_ATTR) ||
    el.hasAttribute?.('data-blp-debug') ||
    el.hasAttribute?.('data-blp-token') ||
    el.hasAttribute?.('data-blp-translate') ||
    el.id === 'blp-nav-settings' ||
    el.id === 'blp-profile-menu-settings' ||
    el.id === 'blp-steam-backloggd-btn' ||
    el.id === 'blp-steamdb-backloggd-btn'
  ) {
    return true;
  }
  if (
    el.classList?.contains('blp-card-badges') ||
    el.classList?.contains('blp-settings-backdrop') ||
    el.classList?.contains('blp-fix-match-backdrop') ||
    el.classList?.contains('blp-export-backdrop') ||
    el.classList?.contains('blp-export-wrap') ||
    el.classList?.contains('blp-export-log-wrap') ||
    el.classList?.contains('blp-debug-panel') ||
    el.classList?.contains('blp-steamdb-cover') ||
    el.classList?.contains('blp-steam-gallery') ||
    el.classList?.contains('blp-similar') ||
    el.classList?.contains('blp-viewer') ||
    el.classList?.contains('blp-title-icon-wrap') ||
    el.classList?.contains('blp-game-id') ||
    el.classList?.contains('blp-toast-host') ||
    el.classList?.contains('blp-toast') ||
    el.classList?.contains('blp-ump') ||
    el.classList?.contains('blp-ump-avatar-spin') ||
    el.classList?.contains('blp-profile-tier-chip') ||
    el.classList?.contains('blp-translate-btn') ||
    el.classList?.contains('blp-translate-result') ||
    el.classList?.contains('blp-translate-desc-slot') ||
    el.classList?.contains('blp-translate-review-slot') ||
    el.id === 'blp-toast-host' ||
    el.id === 'blp-user-mini-profile'
  ) {
    return true;
  }
  return Boolean(
    el.closest?.(
      `[${ENRICH_ATTR}], [${STEAMDB_ATTR}], [${SIMILAR_ATTR}], [${CARD_ATTR}], .blp-card-badges, .blp-settings-backdrop, .blp-fix-match-backdrop, .blp-export-backdrop, .blp-export-wrap, .blp-export-log-wrap, [data-blp-debug], [data-blp-translate], .blp-translate-btn, .blp-translate-result, .blp-translate-desc-slot, .blp-translate-review-slot, #blp-nav-settings, #blp-profile-menu-settings, #blp-toast-host, .blp-toast-host, #blp-user-mini-profile, .blp-ump, .blp-ump-avatar-spin, .blp-profile-tier-chip`
    )
  );
}

export function shouldIgnoreDomMutations(mutations) {
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (node.nodeType !== 1) continue;
      if (!isBlpManagedElement(node)) return false;
    }
  }
  return true;
}

export function observeDom(onChange) {
  const scheduled = debounce(onChange, SCAN_DEBOUNCE_MS);
  const observer = new MutationObserver((mutations) => {
    if (shouldIgnoreDomMutations(mutations)) return;
    scheduled();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  return observer;
}

export function bindSpaNavigation(onNavigate) {
  const run = debounce(onNavigate, 50);
  ['turbo:load', 'turbo:render', 'turbo:frame-load', 'popstate'].forEach((evt) => {
    document.addEventListener(evt, run, true);
    window.addEventListener(evt, run, true);
  });
  let prev = location.href;
  setInterval(() => {
    if (location.href !== prev) {
      prev = location.href;
      run();
    }
  }, 500);
}

export function isSteamHost() {
  const host = location.hostname;
  return (
    host === 'store.steampowered.com' ||
    host.endsWith('.steampowered.com') ||
    host === 'steamcommunity.com' ||
    host.endsWith('.steamcommunity.com')
  );
}

export function isBackloggdHost() {
  return /(^|\.)backloggd\.com$/i.test(location.hostname);
}

export function isSteamDbHost() {
  return /(^|\.)steamdb\.info$/i.test(location.hostname);
}
