import { settings } from '../state.js';

const HIDE_ATTR = 'data-blp-hide-homepage-fuse';

/** Hide Fuse / incontent ad slots tagged for the homepage. */
export function applyHomepageFuseVisibility() {
  if (settings.hideHomepageFuse === true) {
    document.documentElement.setAttribute(HIDE_ATTR, '1');
  } else {
    document.documentElement.removeAttribute(HIDE_ATTR);
  }
}
