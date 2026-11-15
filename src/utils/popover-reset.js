/**
 * Body-level popovers outlive Backloggd's navigations in two ways:
 *
 * - Turbo snapshots `document.body` before a visit, so an open card is saved with the page
 *   and restored (still `.is-open`) when the user goes Back;
 * - bfcache restores the whole document with the card still open.
 *
 * Either way the feature module's `popoverEl` no longer owns the visible copy, so nothing
 * ever closes it — it sticks on screen at its old coordinates. Resetting on the navigation
 * events (and marking the element `data-turbo-temporary` so Turbo drops it from snapshots)
 * keeps the card tied to the page that opened it.
 */

/** Remove every DOM copy of a popover by selector (including ones restored from a snapshot). */
export function dropPopoverCopies(selector) {
  document.querySelectorAll(selector).forEach((el) => el.remove());
}

/**
 * Run `reset` before Turbo caches the page and after any navigation / bfcache restore.
 * `reset` must be idempotent and must drop the module's popover reference.
 */
export function bindPopoverReset(reset) {
  const run = () => reset();
  ['turbo:before-cache', 'turbo:render', 'turbo:load'].forEach((evt) => {
    document.addEventListener(evt, run, true);
  });
  ['popstate', 'pageshow', 'pagehide'].forEach((evt) => {
    window.addEventListener(evt, run, true);
  });
}
