import { unsafeWindow } from '$';
import { settings } from '../state.js';

const packs = import.meta.glob('../i18n/site/*.json', { eager: true, import: 'default' });

/** Locale codes that ship a site dictionary. `en` is the key source, not a translation. */
export function sitePackCodes() {
  return Object.keys(packs)
    .map((path) => {
      const match = path.match(/\/([a-z]{2})\.json$/);
      return match ? match[1] : '';
    })
    .filter((code) => code && code !== 'en')
    .sort();
}

export function normalizeSiteLocale(value) {
  const raw = String(value ?? 'off').trim().toLowerCase();
  if (raw === 'off' || raw === 'en' || raw === 'auto') return 'off';
  return sitePackCodes().includes(raw) ? raw : 'off';
}

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE', 'SVG', 'CANVAS']);

let active = null;

function packFor(code) {
  const path = Object.keys(packs).find((item) => item.endsWith(`/${code}.json`));
  return path ? packs[path] : null;
}

function isPlusUi(node) {
  const el = node.nodeType === 1 ? node : node.parentElement;
  return Boolean(el && el.closest('.blp-settings, .blp-settings-backdrop, .blp-toast'));
}

/**
 * @param {string} code
 * @param {Record<string, string>} dict
 */
function createEngine(code, dict) {
  const fold = new Map();
  for (const [key, value] of Object.entries(dict)) fold.set(key.toLowerCase(), value);
  const russian = code === 'ru';

  const months = {
    Jan: 'янв', Feb: 'фев', Mar: 'мар', Apr: 'апр', May: 'мая', Jun: 'июн',
    Jul: 'июл', Aug: 'авг', Sep: 'сен', Oct: 'окт', Nov: 'ноя', Dec: 'дек',
  };
  const monthsFull = {
    January: 'января', February: 'февраля', March: 'марта', April: 'апреля',
    May: 'мая', June: 'июня', July: 'июля', August: 'августа',
    September: 'сентября', October: 'октября', November: 'ноября', December: 'декабря',
  };
  const unit = {
    minute: ['минуту', 'минуты', 'минут'],
    minutes: ['минуту', 'минуты', 'минут'],
    hour: ['час', 'часа', 'часов'],
    hours: ['час', 'часа', 'часов'],
    day: ['день', 'дня', 'дней'],
    days: ['день', 'дня', 'дней'],
    week: ['неделю', 'недели', 'недель'],
    weeks: ['неделю', 'недели', 'недель'],
    month: ['месяц', 'месяца', 'месяцев'],
    months: ['месяц', 'месяца', 'месяцев'],
    year: ['год', 'года', 'лет'],
    years: ['год', 'года', 'лет'],
  };
  const countWord = {
    Likes: ['лайк', 'лайка', 'лайков'],
    Like: ['лайк', 'лайка', 'лайков'],
    Reviews: ['рецензия', 'рецензии', 'рецензий'],
    Review: ['рецензия', 'рецензии', 'рецензий'],
    Plays: ['прохождение', 'прохождения', 'прохождений'],
    Play: ['прохождение', 'прохождения', 'прохождений'],
    Lists: ['список', 'списка', 'списков'],
    List: ['список', 'списка', 'списков'],
    Games: ['игра', 'игры', 'игр'],
    Game: ['игра', 'игры', 'игр'],
    Comments: ['комментарий', 'комментария', 'комментариев'],
    Comment: ['комментарий', 'комментария', 'комментариев'],
    Ratings: ['оценка', 'оценки', 'оценок'],
    Rating: ['оценка', 'оценки', 'оценок'],
    Backlogs: ['в бэклоге', 'в бэклоге', 'в бэклоге'],
    Wishlists: ['в желаемом', 'в желаемом', 'в желаемом'],
    Playing: ['играет', 'играют', 'играют'],
    Followers: ['подписчик', 'подписчика', 'подписчиков'],
    Following: ['подписка', 'подписки', 'подписок'],
  };

  function plural(n, forms) {
    const x = Math.abs(Number(n)) % 100;
    const d = x % 10;
    if (x > 10 && x < 20) return forms[2];
    if (d > 1 && d < 5) return forms[1];
    if (d === 1) return forms[0];
    return forms[2];
  }

  function countRepl(n, word) {
    const forms = countWord[word];
    if (!forms) return null;
    const num = String(n).replace(/,/g, '');
    const base = /[KMBkmb]$/.test(num) ? 5 : Number(num);
    return `${n} ${plural(Number.isFinite(base) ? base : 5, forms)}`;
  }

  function preserveEdges(raw, translated) {
    const lead = raw.match(/^\s*/)[0];
    const trail = raw.match(/\s*$/)[0];
    return lead + translated + trail;
  }

  function translateText(raw) {
    if (!raw) return null;
    const text = raw.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
    if (!text || text.length > 600) return null;
    if (russian) {
      if (/^owned,\s*subscription,/i.test(text)) return preserveEdges(raw, 'своя копия, подписка…');
      if (/^Added in (.+)$/i.test(text)) return preserveEdges(raw, `Добавлено в ${text.replace(/^Added in\s+/i, '')}`);
      if (/^you currently have no lists\b/i.test(text)) {
        const withLink = /\b(go\s+)?here\b/i.test(text);
        return preserveEdges(raw, withLink ? 'Списков пока нет. Создайте здесь' : 'Списков пока нет. Создайте');
      }
      if (/^what['’]d you think[.…]{0,3}$/i.test(text)) return preserveEdges(raw, 'Что думаете…');
      if (/over\s+\d+/.test(text)) {
        const next = text.replace(/s?\s*over\s+(\d+)/i, ' на $1');
        if (next !== text) return preserveEdges(raw, next.replace(/^\s+/, ''));
      }
    }
    if (Object.prototype.hasOwnProperty.call(dict, text)) return preserveEdges(raw, dict[text]);
    const folded = fold.get(text.toLowerCase());
    if (folded != null) return preserveEdges(raw, folded);
    if (!russian) return null;
    const counted = text.match(/^([\d.,]+[KMBkmb]?)\s+(Likes|Like|Reviews|Review|Plays|Play|Lists|List|Games|Game|Comments|Comment|Ratings|Rating|Backlogs|Wishlists|Playing|Followers|Following)$/);
    if (counted) {
      const next = countRepl(counted[1], counted[2]);
      if (next) return preserveEdges(raw, next);
    }
    const shortAgo = {
      min: 'minute', mins: 'minutes', hr: 'hour', hrs: 'hours',
      sec: 'second', secs: 'seconds', mo: 'month', mos: 'months', yr: 'year', yrs: 'years',
    };
    const ago = text.match(/^(\d+)\s+([a-z]+)\s+ago$/i);
    if (ago) {
      const name = unit[ago[2].toLowerCase()] ? ago[2].toLowerCase() : shortAgo[ago[2].toLowerCase()];
      if (name && unit[name]) return preserveEdges(raw, `${ago[1]} ${plural(ago[1], unit[name])} назад`);
    }
    const oneAgo = text.match(/^(?:an?|a)\s+(minute|hour|day|week|month|year)\s+ago$/i);
    if (oneAgo) {
      const name = oneAgo[1].toLowerCase();
      const key = name === 'minute' ? 'minute' : name;
      return preserveEdges(raw, `1 ${plural(1, unit[key] || unit[`${key}s`])} назад`);
    }
    if (/^just now$/i.test(text)) return preserveEdges(raw, 'только что');
    const ratingShare = text.match(/^(.*?)Ratings\s*\(([\d.]+)%\)$/i);
    if (ratingShare && text.length < 80) return preserveEdges(raw, `${ratingShare[1]}Оценки (${ratingShare[2]}%)`);
    const avg = text.match(/^Avg\s+([\d.]+)$/i);
    if (avg) return preserveEdges(raw, `Ср. ${avg[1]}`);
    const collectionStats = text.match(/^View my ['"«“](.+)['"»”] stats$/i);
    if (collectionStats) return preserveEdges(raw, `Статистика «${collectionStats[1]}»`);
    const playedFor = text.match(/^(\d+)h(?:\s*(\d+)m)?$/i);
    if (playedFor) return preserveEdges(raw, playedFor[2] ? `${playedFor[1]} ч ${playedFor[2]} мин` : `${playedFor[1]} ч`);
    const span = text.match(/^(\d+)\s+(day|days|hour|hours|minute|minutes)$/i);
    if (span) return preserveEdges(raw, `${span[1]} ${plural(span[1], unit[span[2].toLowerCase()])}`);
    const badgeEarned = text.match(/^You earned the (.+) badge\.?$/i);
    if (badgeEarned) return preserveEdges(raw, `Получен значок «${badgeEarned[1]}»`);
    const month = text.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:,)?(?:\s+(\d{4}))?$/);
    if (month) return preserveEdges(raw, `${month[2]} ${months[month[1]]}${month[3] ? ` ${month[3]}` : ''}`);
    const monthLong = text.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})$/);
    if (monthLong) return preserveEdges(raw, `${monthLong[2]} ${monthsFull[monthLong[1]]} ${monthLong[3]}`);
    const namedMonth = text.match(/^(January|February|March|April|May|June|July|August|September|October|November|December),?\s+(\d{4})$/);
    if (namedMonth) {
      const names = { January: 'январь', February: 'февраль', March: 'март', April: 'апрель', May: 'май', June: 'июнь', July: 'июль', August: 'август', September: 'сентябрь', October: 'октябрь', November: 'ноябрь', December: 'декабрь' };
      return preserveEdges(raw, `${names[namedMonth[1]]} ${namedMonth[2]}`);
    }
    const showing = text.match(/^Showing\s+(\d+)\s+games?(?:\s+with)?$/i);
    if (showing) {
      const tail = /with$/i.test(text) ? ' с' : '';
      return preserveEdges(raw, `Показано ${showing[1]} ${plural(showing[1], countWord.Games)}${tail}`);
    }
    if (/^Added in /i.test(text)) return null;
    const added = text.match(/^(.+) has no lists$/);
    if (added) return preserveEdges(raw, `У ${added[1]} нет списков`);
    const likedGames = text.match(/^(\d+)\s+games liked by (.+)$/i);
    if (likedGames) return preserveEdges(raw, `${countRepl(likedGames[1], 'Games')}, которые лайкнул ${likedGames[2]}`);
    const likedReviews = text.match(/^(\d+)\s+reviews liked by (.+)$/i);
    if (likedReviews) return preserveEdges(raw, `${countRepl(likedReviews[1], 'Reviews')}, которые лайкнул ${likedReviews[2]}`);
    const byName = text.match(/^by\s+(\S+)$/);
    if (byName) return preserveEdges(raw, `от ${byName[1]}`);
    const onPlat = text.match(/^on\s+(.+)$/);
    if (onPlat) return preserveEdges(raw, `на ${dict[onPlat[1]] || onPlat[1]}`);
    const crackedIn = text.match(/^Cracked in (\d+) day\(s\)$/i);
    if (crackedIn) {
      const n = Number(crackedIn[1]);
      const word = n === 1 ? 'день' : n > 1 && n < 5 ? 'дня' : 'дней';
      return preserveEdges(raw, `Взломана через ${crackedIn[1]} ${word}`);
    }
    const playedIn = text.match(/^Played in (\d{4})$/);
    if (playedIn) return preserveEdges(raw, `Сыграно в ${playedIn[1]}`);
    const earned = text.match(/^(Earned|Joined) on (.+)$/);
    if (earned) return preserveEdges(raw, `${earned[1] === 'Earned' ? 'Получено' : 'На сайте с'} ${earned[2]}`);
    if (/^[‹«<]\s*Prev$/i.test(text)) return preserveEdges(raw, '‹ Назад');
    if (/^Next\s*[›»>]$/i.test(text)) return preserveEdges(raw, 'Далее ›');
    return null;
  }

  const attrOk = new Set(['placeholder', 'title', 'aria-label', 'aria-description', 'alt', 'data-original-title', 'data-title', 'data-content', 'data-text', 'value']);

  function translateAttrs(el) {
    if (!el || el.nodeType !== 1 || !el.attributes || isPlusUi(el)) return;
    for (const attr of el.attributes) {
      const name = attr.name.toLowerCase();
      if (!attrOk.has(name) && !name.startsWith('data-')) continue;
      if (name === 'data-target' || name === 'data-action' || name === 'data-controller') continue;
      const value = attr.value;
      const visible = name === 'placeholder' || name === 'title' || name === 'aria-label' || name === 'aria-description';
      if (!value || value.length > 240) continue;
      if (!visible && (value.includes('/') || (value.indexOf(' ') === -1 && value.length > 24))) continue;
      const next = translateText(value);
      if (next != null && next.trim() !== value) el.setAttribute(attr.name, next.trim());
    }
    if (el.tagName === 'INPUT') {
      const type = (el.getAttribute('type') || '').toLowerCase();
      if (type === 'submit' || type === 'button' || type === 'reset') {
        const next = translateText(el.value);
        if (next != null && next !== el.value) el.value = next.trim();
      }
    }
  }

  function translateNode(node) {
    if (!node || isPlusUi(node)) return;
    if (node.nodeType === 11) {
      for (const child of node.childNodes) translateNode(child);
      return;
    }
    if (node.nodeType === 3) {
      if (/^(expand|collapse|show more|show less)$/i.test(String(node.nodeValue || '').trim())) return;
      const next = translateText(node.nodeValue);
      if (next != null && next !== node.nodeValue) node.nodeValue = next;
      return;
    }
    if (node.nodeType !== 1) return;
    translateAttrs(node);
    if (SKIP_TAGS.has(node.tagName) || node.isContentEditable) return;
    if (node.shadowRoot) translateNode(node.shadowRoot);
    for (const child of node.childNodes) translateNode(child);
  }

  const TOGGLE_SEL = 'a.review-more, #summary-expand-btn, a[data-toggle="collapse"], a[data-bs-toggle="collapse"]';

  function labelToggle(el) {
    el.classList.remove('blp-site-toggle', 'blp-site-after', 'blp-site-before');
    el.removeAttribute('data-blp-site-toggle');
    el.removeAttribute('data-blp-site-after');
    el.removeAttribute('data-blp-site-before');
  }

  function translatePseudos(root) {
    const styleId = 'blp-site-locale-pseudo';
    let style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      (document.body || document.documentElement).appendChild(style);
    }
    style.textContent = [
      '.blp-site-before::before { content: attr(data-blp-site-before) !important; }',
      '.blp-site-after::after { content: attr(data-blp-site-after) !important; }',
      '.blp-expand-ghost::after { color: transparent !important; }',
      '.blp-expand-ru { pointer-events: none; color: #e8eaed; font-size: 12px; line-height: 1; margin-left: 0.35rem; }',
      '.blp-welcome-wrap { white-space: normal !important; overflow: visible !important; text-overflow: unset !important; min-width: 0 !important; flex: 1 1 16rem !important; max-width: 100%; }',
      '.blp-welcome-row { flex-wrap: wrap !important; align-items: center !important; }',
    ].join('\n');
    root.querySelectorAll(`${TOGGLE_SEL}, .expand-review-col, .expand-review-col *`).forEach((el) => labelToggle(el));
    root.querySelectorAll('.blp-site-after, .blp-site-before, .blp-site-toggle').forEach((el) => {
      if (el.closest('.expand-review-col, .review-bottom-bar') || el.querySelector(TOGGLE_SEL)) labelToggle(el);
    });
    const nodes = root.querySelectorAll('a, button, span, div, label, p, i, em, small');
    for (const el of nodes) {
      if (isPlusUi(el)) continue;
      if (el.matches(TOGGLE_SEL) || el.closest('.expand-review-col, .review-bottom-bar') || el.querySelector(TOGGLE_SEL)) continue;
      if ((el.textContent || '').trim().length > 48) continue;
      for (const side of ['::before', '::after']) {
        let content = '';
        try {
          content = getComputedStyle(el, side).content;
        } catch {
          continue;
        }
        const clean = String(content || '').replace(/^["']|["']$/g, '').trim();
        if (!clean || clean === 'none' || clean === 'normal') continue;
        const translated = translateText(clean);
        const next = translated == null ? null : translated.trim();
        if (next == null || next === clean) continue;
        if (side === '::before') {
          el.setAttribute('data-blp-site-before', next);
          el.classList.add('blp-site-before');
        } else {
          el.setAttribute('data-blp-site-after', next);
          el.classList.add('blp-site-after');
        }
      }
    }
    root.querySelectorAll(TOGGLE_SEL).forEach((el) => paintToggleFace(el));
  }

  function pseudoWord(el, side) {
    try {
      const clean = String(getComputedStyle(el, side).content || '').replace(/^["']|["']$/g, '').trim();
      if (/^(expand|collapse|show more|show less)$/i.test(clean)) return clean;
    } catch {
      /* unreadable pseudo */
    }
    return '';
  }

  function paintToggleFace(el) {
    const toggle = el?.matches?.(TOGGLE_SEL) ? el : el?.querySelector?.(TOGGLE_SEL);
    if (!toggle || isPlusUi(toggle)) return;
    toggle.classList.remove('blp-expand-face', 'blp-expand-face-before', 'blp-expand-cover', 'blp-site-after', 'blp-site-before');
    const ownText = (toggle.textContent || '').replace(/\s+/g, ' ').trim();
    const wordOnToggle = Boolean(pseudoWord(toggle, '::after') || pseudoWord(toggle, '::before') || /^(expand|collapse|show more|show less)$/i.test(ownText) || toggle.classList.contains('blp-expand-ghost'));
    const carrier = wordOnToggle ? toggle : toggle.parentElement;
    if (!carrier) return;
    const carrierText = (carrier.textContent || '').replace(/\s+/g, ' ').trim();
    const hasWord = wordOnToggle || Boolean(pseudoWord(carrier, '::after') || pseudoWord(carrier, '::before') || /^(expand|collapse|show more|show less)$/i.test(carrierText) || carrier.classList.contains('blp-expand-ghost'));
    if (!hasWord) return;
    carrier.classList.add('blp-expand-ghost');
    const host = carrier.parentElement || carrier;
    const open = toggle.getAttribute('aria-expanded') === 'true';
    const kind = /show/i.test(pseudoWord(carrier, '::after') || pseudoWord(carrier, '::before') || '') ? 'show' : (carrier.getAttribute('data-blp-expand-kind') || 'expand');
    carrier.setAttribute('data-blp-expand-kind', kind);
    const dictKey = open ? (kind === 'show' ? 'SHOW LESS' : 'COLLAPSE') : (kind === 'show' ? 'SHOW MORE' : 'EXPAND');
    const next = translateText(dictKey);
    if (!next || !next.trim()) return;
    let ru = host.querySelector(':scope > .blp-expand-ru');
    if (!ru) {
      ru = document.createElement('span');
      ru.className = 'blp-expand-ru';
      ru.setAttribute('aria-hidden', 'true');
      host.appendChild(ru);
    }
    ru.textContent = next.trim();
  }

  function fixSplitOver(root) {
    if (!russian) return;
    const elements = root.querySelectorAll('div, span, p, a, li, small, section, h2, h3, h4');
    for (const el of elements) {
      if (isPlusUi(el)) continue;
      const visible = el.innerText || '';
      if (visible.length > 90 || !/over\s*\d+/i.test(visible)) continue;
      if ([...el.children].some((child) => /over\s*\d+/i.test(child.innerText || ''))) continue;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const texts = [];
      while (walker.nextNode()) texts.push(walker.currentNode);
      for (const node of texts) {
        const value = node.nodeValue;
        if (!value) continue;
        if (/over/i.test(value)) node.nodeValue = value.replace(/s?\s*over\s*/i, ' на ');
        else if (value.trim() === 's') node.nodeValue = '';
      }
    }
  }

  return { translateNode, fixSplitOver, translatePseudos, labelToggle, paintToggleFace };
}

const EXPAND_CLICK_SEL = 'a.review-more, #summary-expand-btn, a[data-toggle="collapse"], a[data-bs-toggle="collapse"], .expand-review-col';

function panelForToggle(toggle) {
  const sel = toggle.getAttribute('href') || toggle.getAttribute('data-target') || toggle.getAttribute('data-bs-target') || '';
  if (!sel || sel.charAt(0) !== '#' || sel === '#') return null;
  try {
    return document.querySelector(sel);
  } catch {
    return null;
  }
}

function bindExpandFix() {
  if (document.documentElement.dataset.blpExpandFix) return;
  document.documentElement.dataset.blpExpandFix = '1';
  document.addEventListener('click', (event) => {
    const hit = event.target?.closest?.(EXPAND_CLICK_SEL);
    if (!hit || hit.closest('.blp-settings, .blp-translate-btn')) return;
    const toggle = hit.matches('.expand-review-col') ? hit.querySelector('a, button, [data-toggle="collapse"], [data-bs-toggle="collapse"]') || hit : hit;
    const panel = panelForToggle(toggle);
    if (!panel) return;
    event.preventDefault();
    event.stopPropagation();
    const open = panel.classList.contains('show');
    const pageWindow = unsafeWindow || window;
    const $ = pageWindow.jQuery || pageWindow.$;
    if ($?.fn?.collapse) {
      try {
        $(panel).collapse(open ? 'hide' : 'show');
        return;
      } catch {
        /* fall through */
      }
    }
    panel.classList.toggle('show', !open);
    panel.classList.add('collapse');
    panel.style.display = open ? 'none' : 'block';
    panel.style.height = open ? '' : 'auto';
    toggle.classList.toggle('collapsed', open);
    toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
  }, true);
}

function fixTightButtons() {
  document.querySelectorAll('a, button').forEach((el) => {
    if (el.closest('.blp-settings, .blp-toast')) return;
    const text = (el.innerText || '').replace(/\s+/g, ' ').trim();
    if (!text) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (/^your$/i.test((walker.currentNode.nodeValue || '').trim()) && /измен/i.test(text)) {
        walker.currentNode.nodeValue = walker.currentNode.nodeValue.replace(/your/i, 'запись');
      }
    }
    const next = (el.innerText || '').replace(/\s+/g, ' ').trim();
    if (next.length < 16 && el.scrollWidth <= el.clientWidth + 1) return;
    if (!/запис|реценз|измен|log or review/i.test(next)) return;
    el.style.setProperty('white-space', 'normal', 'important');
    el.style.setProperty('height', 'auto', 'important');
    el.style.setProperty('line-height', '1.2', 'important');
    el.style.setProperty('text-align', 'center', 'important');
  });
}

function fixWelcomeWrap() {
  if (!document.body) return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) {
    const el = walker.currentNode;
    if (el.closest('.blp-settings, .blp-toast')) continue;
    const text = el.textContent || '';
    if (!text.includes('С возвращением') || !text.includes('попробуй случайный')) continue;
    if (text.length > 420) continue;
    const childHasBoth = [...el.children].some((child) => {
      const childText = child.textContent || '';
      return childText.includes('С возвращением') && childText.includes('попробуй случайный');
    });
    if (childHasBoth) continue;
    el.classList.remove('text-nowrap');
    el.style.setProperty('white-space', 'normal', 'important');
    el.style.setProperty('min-width', '0', 'important');
    el.style.setProperty('flex', '1 1 auto', 'important');
    return;
  }
}

export function startSiteLocale() {
  const code = normalizeSiteLocale(settings.siteLocale);
  if (!code || active) return;
  const dict = packFor(code);
  if (!dict) return;
  active = code;
  const engine = createEngine(code, dict);
  bindExpandFix();
  let scheduled = false;
  const run = () => {
    scheduled = false;
    if (!document.body) return;
    engine.translateNode(document.body);
    engine.fixSplitOver(document.body);
    engine.translatePseudos(document.body);
    fixWelcomeWrap();
    fixTightButtons();
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    else setTimeout(run, 16);
  };
  schedule();
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') {
        engine.translateNode(record.target);
        if (record.target.parentElement) engine.paintToggleFace(record.target.parentElement);
      }
      for (const node of record.addedNodes) engine.translateNode(node);
      if (record.attributeName === 'aria-expanded' && record.target?.matches?.('a.review-more, #summary-expand-btn, a[data-toggle="collapse"], a[data-bs-toggle="collapse"]')) {
        engine.paintToggleFace(record.target);
      }
      if (record.type === 'attributes' && record.target) engine.translateNode(record.target);
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['placeholder', 'title', 'aria-label', 'aria-expanded'],
  });
  document.addEventListener('turbo:load', schedule);
  document.addEventListener('turbo:render', schedule);
  document.addEventListener('turbo:frame-render', schedule);
}
