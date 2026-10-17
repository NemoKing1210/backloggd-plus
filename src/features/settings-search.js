import { fmt } from '../i18n/index.js';
import { t } from '../state.js';
import { escapeAttr, escapeHtml } from '../utils/html.js';

const ITEM_SELECTOR = '.blp-toggle, .blp-field, .blp-settings-backup__item';
const HIDE_CLASS = 'blp-search-hide';
const SKIP_TEXT_PARENTS = 'option, select, script, style, textarea';
const FIRST_CLASS = 'blp-search-first';
const FLASH_MS = 1100;

/** Lowercase + strip accents; ё/й fold to е/и. Keeps a map back to original offsets. */
function fold(text) {
  let norm = '';
  const map = [];
  for (let i = 0; i < text.length; i += 1) {
    const f = text[i].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    for (let k = 0; k < f.length; k += 1) {
      norm += f[k];
      map.push(i);
    }
  }
  return { norm, map };
}

function foldText(text) {
  return fold(String(text || '').replace(/\s+/g, ' ')).norm;
}

function tokenize(query) {
  return foldText(query)
    .split(' ')
    .filter(Boolean);
}

function matchesAll(haystack, tokens) {
  return tokens.every((tok) => haystack.includes(tok));
}

function findRanges(text, tokens) {
  const { norm, map } = fold(text);
  const ranges = [];
  for (const tok of tokens) {
    let from = 0;
    for (;;) {
      const at = norm.indexOf(tok, from);
      if (at < 0) break;
      ranges.push([map[at], map[at + tok.length - 1] + 1]);
      from = at + tok.length;
    }
  }
  if (!ranges.length) return ranges;
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [ranges[0]];
  for (let i = 1; i < ranges.length; i += 1) {
    const last = merged[merged.length - 1];
    if (ranges[i][0] <= last[1]) last[1] = Math.max(last[1], ranges[i][1]);
    else merged.push(ranges[i]);
  }
  return merged;
}

function highlightIn(root, tokens) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      return node.parentElement?.closest(`${SKIP_TEXT_PARENTS}, mark.blp-mark`)
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const text = node.nodeValue;
    const ranges = findRanges(text, tokens);
    if (!ranges.length) continue;
    const frag = document.createDocumentFragment();
    let pos = 0;
    for (const [start, end] of ranges) {
      if (start > pos) frag.append(text.slice(pos, start));
      const mark = document.createElement('mark');
      mark.className = 'blp-mark';
      mark.textContent = text.slice(start, end);
      frag.append(mark);
      pos = end;
    }
    if (pos < text.length) frag.append(text.slice(pos));
    node.replaceWith(frag);
  }
}

function clearMarks(root) {
  const parents = new Set();
  root.querySelectorAll('mark.blp-mark').forEach((mark) => {
    parents.add(mark.parentNode);
    mark.replaceWith(document.createTextNode(mark.textContent));
  });
  parents.forEach((p) => p?.normalize());
}

export function buildSettingsSearchHtml() {
  return `
    <div class="blp-search" role="search">
      <svg class="blp-search__icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>
      <input
        type="text"
        class="blp-search__input"
        data-blp-search
        autocomplete="off"
        spellcheck="false"
        maxlength="80"
        placeholder="${escapeAttr(t.settingsSearchPlaceholder)}"
        aria-label="${escapeAttr(t.settingsSearchLabel)}"
        title="${escapeAttr(t.settingsSearchShortcut)}"
      />
      <span class="blp-search__count" data-blp-search-count aria-live="polite"></span>
      <kbd class="blp-search__kbd" aria-hidden="true">/</kbd>
      <button type="button" class="blp-search__clear" data-blp-search-clear hidden aria-label="${escapeAttr(t.settingsSearchClear)}" title="${escapeAttr(t.settingsSearchClear)}">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>
      </button>
    </div>
  `;
}

export function buildSettingsSearchEmptyHtml() {
  return `
    <div class="blp-search-empty" data-blp-search-empty hidden>
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5M8.5 11h5"></path></svg>
      <p class="blp-search-empty__title" data-blp-search-empty-title></p>
      <p class="blp-hint">${escapeHtml(t.settingsSearchEmptyHint)}</p>
    </div>
  `;
}

/**
 * Wire the settings search box: filters toggles/fields across every tab, highlights
 * matches, and shows each tab's hits under its own heading.
 *
 * @param {HTMLElement} dialog `.blp-settings`
 * @param {{ activateTab: (root: HTMLElement, id: string) => void }} opts
 * @returns {{ handleEscape: () => boolean, destroy: () => void }}
 */
export function initSettingsSearch(dialog, { activateTab }) {
  const input = dialog.querySelector('[data-blp-search]');
  const body = dialog.querySelector('.blp-settings__body');
  const countEl = dialog.querySelector('[data-blp-search-count]');
  const clearBtn = dialog.querySelector('[data-blp-search-clear]');
  const kbd = dialog.querySelector('.blp-search__kbd');
  const emptyEl = dialog.querySelector('[data-blp-search-empty]');
  const emptyTitle = dialog.querySelector('[data-blp-search-empty-title]');
  const tabsEl = dialog.querySelector('.blp-settings__tabs');
  if (!input || !body) return { handleEscape: () => false, destroy() {} };

  const tabLabels = new Map();
  dialog.querySelectorAll('[data-blp-tab]').forEach((btn) => {
    tabLabels.set(
      btn.getAttribute('data-blp-tab'),
      btn.querySelector('.blp-settings__tab-label')?.textContent?.trim() || ''
    );
  });

  // Index once: the markup is static apart from state (switch positions, values).
  const panels = [...body.querySelectorAll('.blp-settings__panel')].map((panel) => {
    const id = panel.id.replace(/^blp-panel-/, '');
    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'blp-search-panel-head';
    head.setAttribute('data-blp-search-tab', id);
    head.title = fmt(t.settingsSearchOpenTab, { tab: tabLabels.get(id) || id });
    head.innerHTML = `<span class="blp-search-panel-head__label">${escapeHtml(tabLabels.get(id) || id)}</span><span class="blp-search-panel-head__count"></span>`;
    panel.prepend(head);

    const groups = [...panel.querySelectorAll('.blp-settings-group')].map((group) => {
      const groupHead = group.querySelector('.blp-settings-group__head');
      const items = [...group.querySelectorAll(ITEM_SELECTOR)].map((el) => ({
        el,
        text: foldText(el.textContent),
      }));
      return {
        el: group,
        head: groupHead,
        headText: foldText(groupHead?.textContent),
        items,
        // Groups without toggles/fields (accent picker, cache meter, About) match as a whole.
        wholeText: items.length ? '' : foldText(group.textContent),
      };
    });
    return { id, el: panel, head, groups };
  });

  let searching = false;
  let flashTimer = 0;

  const showAll = () => {
    body.querySelectorAll(`.${HIDE_CLASS}, .${FIRST_CLASS}`).forEach((el) => {
      el.classList.remove(HIDE_CLASS, FIRST_CLASS);
    });
    if (emptyEl) emptyEl.hidden = true;
  };

  const setSearching = (on) => {
    searching = on;
    dialog.classList.toggle('is-searching', on);
    tabsEl?.querySelectorAll('[data-blp-tab]').forEach((btn) => {
      if (!on) btn.classList.remove('is-dim');
    });
  };

  const clearSearch = (restoreTab = true) => {
    if (!searching && !input.value) return;
    input.value = '';
    clearMarks(body);
    showAll();
    setSearching(false);
    if (countEl) countEl.textContent = '';
    if (clearBtn) clearBtn.hidden = true;
    if (kbd) kbd.hidden = false;
    if (restoreTab) {
      const activeId = tabsEl?.querySelector('.blp-settings__tab.is-active')?.getAttribute('data-blp-tab');
      if (activeId) activateTab(dialog, activeId);
    }
  };

  const apply = () => {
    const query = input.value;
    const tokens = tokenize(query);
    if (clearBtn) clearBtn.hidden = !query;
    if (kbd) kbd.hidden = Boolean(query);
    if (!tokens.length) {
      clearSearch(true);
      return;
    }

    clearMarks(body);
    showAll();
    setSearching(true);

    let total = 0;
    for (const panel of panels) {
      let panelHits = 0;
      for (const group of panel.groups) {
        let groupHits = 0;
        if (group.items.length) {
          for (const item of group.items) {
            const hit = matchesAll(`${group.headText} ${item.text}`, tokens);
            item.el.classList.toggle(HIDE_CLASS, !hit);
            if (hit) {
              groupHits += 1;
              highlightIn(item.el, tokens);
            }
          }
          // Lists left without any visible row collapse; the first visible row drops its divider.
          group.el.querySelectorAll('.blp-settings-list').forEach((list) => {
            const first = list.querySelector(`${ITEM_SELECTOR}:not(.${HIDE_CLASS})`);
            list.classList.toggle(HIDE_CLASS, !first);
            first?.classList.add(FIRST_CLASS);
          });
        } else if (matchesAll(group.wholeText, tokens)) {
          groupHits = 1;
          highlightIn(group.el, tokens);
        }
        group.el.classList.toggle(HIDE_CLASS, groupHits === 0);
        if (groupHits) {
          highlightIn(group.head, tokens);
          panelHits += groupHits;
        }
      }
      panel.el.hidden = panelHits === 0;
      const countNode = panel.head.querySelector('.blp-search-panel-head__count');
      if (countNode) countNode.textContent = panelHits ? String(panelHits) : '';
      tabsEl
        ?.querySelector(`[data-blp-tab="${panel.id}"]`)
        ?.classList.toggle('is-dim', panelHits === 0);
      total += panelHits;
    }

    if (countEl) countEl.textContent = total ? fmt(t.settingsSearchCount, { count: total }) : '';
    if (emptyEl) {
      emptyEl.hidden = total > 0;
      if (emptyTitle) emptyTitle.textContent = fmt(t.settingsSearchEmpty, { query: query.trim() });
    }
    body.scrollTop = 0;
  };

  const focusFirstResult = () => {
    const panel = panels.find((p) => !p.el.hidden);
    if (!panel) return;
    const group = panel.groups.find((g) => !g.el.classList.contains(HIDE_CLASS));
    if (!group) return;
    const item = group.items.find((i) => !i.el.classList.contains(HIDE_CLASS));
    const target = item?.el || group.el;
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const control = target.querySelector('.blp-switch, select:not(:disabled), input:not(:disabled), button');
    control?.focus({ preventScroll: true });
    target.classList.add('is-flash');
    window.clearTimeout(flashTimer);
    flashTimer = window.setTimeout(() => target.classList.remove('is-flash'), FLASH_MS);
  };

  input.addEventListener('input', apply);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      if (!searching) return;
      e.preventDefault();
      focusFirstResult();
    }
  });
  clearBtn?.addEventListener('click', () => {
    clearSearch(true);
    input.focus();
  });

  // A tab click while searching leaves the search and opens that tab (its own handler runs next).
  tabsEl?.addEventListener(
    'click',
    (e) => {
      if (searching && e.target?.closest?.('[data-blp-tab]')) clearSearch(false);
    },
    true
  );

  body.addEventListener('click', (e) => {
    const btn = e.target?.closest?.('[data-blp-search-tab]');
    if (!btn) return;
    const id = btn.getAttribute('data-blp-search-tab');
    clearSearch(false);
    activateTab(dialog, id);
  });

  const onDocKeydown = (e) => {
    if (e.defaultPrevented) return;
    const mod = e.ctrlKey || e.metaKey;
    const isShortcut =
      (mod && !e.altKey && (e.key === 'k' || e.key === 'K')) ||
      (!mod && !e.altKey && e.key === '/' && !e.target?.closest?.('input, textarea, select, [contenteditable]'));
    if (!isShortcut) return;
    if (document.querySelector('.blp-confirm-backdrop')) return;
    e.preventDefault();
    input.focus();
    input.select();
  };
  document.addEventListener('keydown', onDocKeydown, true);

  return {
    /** Esc clears an active query first; a second Esc closes the dialog. */
    handleEscape() {
      if (!input.value) return false;
      clearSearch(true);
      input.focus();
      return true;
    },
    destroy() {
      window.clearTimeout(flashTimer);
      document.removeEventListener('keydown', onDocKeydown, true);
    },
  };
}
