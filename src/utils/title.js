/**
 * Valid roman numeral token (1–3999). Used so "Baldur's Gate III" ≈ "Baldur's Gate 3".
 * Bare "i" is only converted when it is not the first token (avoids "I Am Alive" → "1 am alive").
 */
const ROMAN_TOKEN_RE =
  /^(?=.*[ivxlcdm])(?=[mdclxvi]+$)m{0,4}(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/;

export function romanTokenToArabic(token, { allowLoneI = false } = {}) {
  const t = String(token || '').toLowerCase();
  if (!ROMAN_TOKEN_RE.test(t)) return null;
  if (t === 'i' && !allowLoneI) return null;
  const map = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };
  let total = 0;
  for (let i = 0; i < t.length; i += 1) {
    const value = map[t[i]];
    const next = map[t[i + 1]];
    total += next > value ? -value : value;
  }
  return total > 0 ? total : null;
}

export function normalizeTitle(name) {
  const base = String(name || '')
    .toLowerCase()
    .replace(/[™®©]/g, '')
    // S.T.A.L.K.E.R. → stalker (keep decimals like 1.5)
    .replace(/(?<=[a-z])\.(?=[a-z])/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (!base) return '';
  const parts = base.split(/\s+/).filter(Boolean);
  return parts
    .map((tok, idx) => {
      const arabic = romanTokenToArabic(tok, { allowLoneI: idx > 0 });
      return arabic != null ? String(arabic) : tok;
    })
    .join(' ');
}

export function titleTokens(name) {
  return normalizeTitle(name).split(/\s+/).filter(Boolean);
}

export function isLikelyExtra(name) {
  return /\b(dlc|soundtrack|ost|bundle|pack|edition upgrade|cosmetic)\b/i.test(name);
}

export function isBenignTitlePrefixToken(token) {
  return /^(the|a|an|official|new)$/i.test(token);
}

/** Tokens/phrases that are editions or platforms — not a different game. */
const EDITION_SUFFIX_RE =
  /^(game of the year|goty|definitive( edition)?|complete( edition)?|remastered|remake|deluxe( edition)?|ultimate( edition)?|gold( edition)?|standard( edition)?|premium( edition)?|collector'?s?( edition)?|anniversary( edition)?|enhanced( edition)?|director'?s cut|redux|legacy( edition)?|hd|vr|launcher|for windows( 10)?|pc( edition)?|windows|edition|collection)$/i;

export function isEditionOnlySuffix(text) {
  const raw = normalizeTitle(text);
  if (!raw) return true;
  if (EDITION_SUFFIX_RE.test(raw)) return true;
  // Allow chained edition words: "goty edition", "definitive edition"
  const parts = raw.split(/\s+/);
  let i = 0;
  while (i < parts.length) {
    let matched = false;
    for (let len = Math.min(4, parts.length - i); len >= 1; len -= 1) {
      const chunk = parts.slice(i, i + len).join(' ');
      if (EDITION_SUFFIX_RE.test(chunk)) {
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) return false;
  }
  return true;
}

export function stripEditionSuffix(normalized) {
  const tokens = String(normalized || '')
    .split(/\s+/)
    .filter(Boolean);
  while (tokens.length) {
    let stripped = false;
    for (let len = Math.min(4, tokens.length); len >= 1; len -= 1) {
      const chunk = tokens.slice(tokens.length - len).join(' ');
      if (EDITION_SUFFIX_RE.test(chunk)) {
        tokens.splice(tokens.length - len, len);
        stripped = true;
        break;
      }
    }
    if (!stripped) break;
  }
  return tokens.join(' ');
}

export function indexOfTokenSequence(haystack, needle) {
  if (!needle.length || needle.length > haystack.length) return -1;
  for (let i = 0; i <= haystack.length - needle.length; i += 1) {
    let ok = true;
    for (let j = 0; j < needle.length; j += 1) {
      if (haystack[i + j] !== needle[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return i;
  }
  return -1;
}

/**
 * Score how well a Steam app title matches the Backloggd title.
 * Rejects spin-offs that merely start with the name (Minecraft → Minecraft Dungeons).
 */
export function scoreSteamTitleMatch(steamName, targetTitle) {
  const steam = normalizeTitle(steamName);
  const target = normalizeTitle(targetTitle);
  if (!steam || !target) return 0;
  if (steam === target) return 100;

  const steamCore = stripEditionSuffix(steam);
  const targetCore = stripEditionSuffix(target);
  if (steamCore && targetCore && steamCore === targetCore) return 95;

  // "Celeste" + "goty" / "definitive edition" — OK. "Minecraft" + "dungeons" — not OK.
  if (steam.startsWith(`${target} `) && isEditionOnlySuffix(steam.slice(target.length).trim())) {
    return 90;
  }
  if (
    steamCore &&
    targetCore &&
    steamCore.startsWith(`${targetCore} `) &&
    isEditionOnlySuffix(steamCore.slice(targetCore.length).trim())
  ) {
    return 88;
  }

  const st = titleTokens(steamCore || steam);
  const tt = titleTokens(targetCore || target);
  // Multi-word titles: allow leading "the"/"a" and trailing edition-only tokens.
  if (tt.length >= 2) {
    const idx = indexOfTokenSequence(st, tt);
    if (idx >= 0) {
      const before = st.slice(0, idx);
      const after = st.slice(idx + tt.length);
      if (before.every(isBenignTitlePrefixToken) && isEditionOnlySuffix(after.join(' '))) {
        return 85;
      }
    }
  }

  return 0;
}

const STEAM_TITLE_MATCH_MIN_SCORE = 85;

export function pickSteamSearchItem(items, title) {
  const list = (items || []).filter((i) => i && i.type === 'app' && i.id);
  if (!list.length) return null;

  const nonExtra = list.filter((i) => !isLikelyExtra(i.name));
  const pool = nonExtra.length ? nonExtra : list;

  let best = null;
  let bestScore = 0;
  for (const item of pool) {
    const score = scoreSteamTitleMatch(item.name, title);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  return bestScore >= STEAM_TITLE_MATCH_MIN_SCORE ? best : null;
}
