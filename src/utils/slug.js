export function slugifyForBackloggd(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    // S.T.A.L.K.E.R. → stalker (not s-t-a-l-k-e-r); keep decimals like 1.5
    .replace(/(?<=[a-z])\.(?=[a-z])/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Metacritic `/game/{slug}/` — drop apostrophes (Assassin's → assassins), not hyphenate them. */
export function slugifyForMetacritic(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`´]/g, '')
    .replace(/&/g, ' and ')
    .replace(/(?<=[a-z])\.(?=[a-z])/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function metacriticGameUrl(title, slug) {
  // Backloggd disambiguators: meccha-chameleon--1 → meccha-chameleon
  const raw =
    String(slug || '')
      .replace(/^\/+|\/+$/g, '')
      .replace(/--\d+$/i, '') || slugifyForMetacritic(title);
  if (!raw) return '';
  return `https://www.metacritic.com/game/${encodeURIComponent(raw)}/`;
}
