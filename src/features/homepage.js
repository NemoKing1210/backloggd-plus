import { settings } from '../state.js';

const HIDE_ATTR = 'data-blp-hide-homepage-fuse';
const HOME_ATTR = 'data-blp-home';
const HOME_HIDDEN_ATTR = 'data-blp-home-hidden';

/**
 * Home page blocks that can be hidden from Settings → Home page.
 * `token` is written to `html[data-blp-home-hidden]` (space-separated) and
 * matched by the rules in styles/main.css.
 */
export const HOME_BLOCK_SETTINGS = [
  { key: 'showHomeWidgets', token: 'widgets' },
  { key: 'showHomePopularFriends', token: 'popular-friends' },
  { key: 'showHomeFriendsActivity', token: 'friends-activity' },
  { key: 'showHomeTrending', token: 'trending' },
  { key: 'showHomeNews', token: 'news' },
  { key: 'showHomeFriendReviews', token: 'friend-reviews' },
  { key: 'showHomePopularReviews', token: 'popular-reviews' },
  { key: 'showHomeFriendLists', token: 'friend-lists' },
  { key: 'showHomePopularLists', token: 'popular-lists' },
  { key: 'showHomeComingSoon', token: 'coming-soon' },
  { key: 'showHomeRecentlyAnticipated', token: 'anticipated' },
  { key: 'showHomeSleeperHits', token: 'sleeper' },
  { key: 'showHomePromoBanner', token: 'promo' },
  { key: 'showHomeHero', token: 'hero' },
  { key: 'showHomeCoverMarquee', token: 'marquee' },
  { key: 'showHomeAbout', token: 'about' },
  { key: 'showHomeShowcase', token: 'showcase' },
];

/** Backloggd's home page is only served at `/` (there is no `/home` route). */
export function isHomePage() {
  return location.pathname === '/';
}

/** Hide Fuse / incontent ad slots (homepage, game reviews, etc.). */
export function applyHomepageFuseVisibility() {
  if (settings.hideHomepageFuse !== false) {
    document.documentElement.setAttribute(HIDE_ATTR, '1');
  } else {
    document.documentElement.removeAttribute(HIDE_ATTR);
  }
}

/**
 * Hide the home page blocks the user switched off. Runs on every scan so the
 * root attribute follows Turbo navigations in and out of `/`; the CSS rules
 * only ever apply on the home page.
 */
export function applyHomepageBlockVisibility() {
  const root = document.documentElement;
  if (isHomePage()) root.setAttribute(HOME_ATTR, '1');
  else root.removeAttribute(HOME_ATTR);

  const hidden = HOME_BLOCK_SETTINGS.filter(({ key }) => settings[key] === false).map(
    ({ token }) => token
  );
  if (isHomePage() && hidden.length) root.setAttribute(HOME_HIDDEN_ATTR, hidden.join(' '));
  else root.removeAttribute(HOME_HIDDEN_ATTR);
}
