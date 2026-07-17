export function getPageContext() {
  const path = location.pathname || '/';
  const gameMatch = path.match(/^\/games\/([^/]+)\/?/i);
  return {
    path,
    isGamePage: Boolean(gameMatch) && !!document.getElementById('game-body'),
    slug: gameMatch ? gameMatch[1].toLowerCase() : '',
    isProfile: /^\/u\/[^/]+\/?/.test(path),
    isSearch: path.startsWith('/search'),
  };
}

export function getGameTitle() {
  const h1 = document.querySelector('#game-profile h1, #center-content h1, main h1');
  return (h1?.textContent || '').trim();
}

export function getIgdbUrl(slug) {
  const link = document.querySelector('a[href*="igdb.com/games/"]');
  if (link?.href) return link.href.split('?')[0];
  if (slug) return `https://www.igdb.com/games/${encodeURIComponent(slug)}`;
  return '';
}
