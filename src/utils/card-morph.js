const SEC_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const LEAVING_SEC = 'is-leaving-sec';

export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/**
 * Re-use old DOM nodes that did not change so they are not re-created (no flicker, no replayed
 * animation). Identical subtrees are moved over; same-looking containers are walked recursively.
 */
function reuseNodes(oldParent, newParent, reused) {
  const pool = [...oldParent.children];
  for (const child of [...newParent.children]) {
    const same = pool.findIndex((o) => o.outerHTML === child.outerHTML);
    if (same >= 0) {
      const [o] = pool.splice(same, 1);
      child.replaceWith(o);
      reused.add(o);
      continue;
    }
    const alike = pool.findIndex((o) => o.tagName === child.tagName && o.className === child.className);
    if (alike >= 0) {
      const [o] = pool.splice(alike, 1);
      reuseNodes(o, child, reused);
    }
  }
}

/** Newly created leaves of a section (skipping re-used nodes) — these get the fade-in. */
function freshTargets(root, reused, out = []) {
  const kids = [...root.children];
  if (!kids.length) {
    out.push(root);
    return out;
  }
  for (const kid of kids) {
    if (reused.has(kid)) continue;
    const holdsReused = [...reused].some((r) => kid.contains(r));
    if (holdsReused) freshTargets(kid, reused, out);
    else out.push(kid);
  }
  return out;
}

/** Collapse + fade a block that no longer has content, then drop it. */
function leaveSection(node) {
  if (prefersReducedMotion()) {
    node.remove();
    return;
  }
  node.classList.add(LEAVING_SEC);
  node.style.overflow = 'hidden';
  const anim = node.animate(
    [
      { height: `${node.offsetHeight}px`, marginTop: getComputedStyle(node).marginTop, opacity: 1 },
      { height: '0px', marginTop: '0px', opacity: 0 },
    ],
    { duration: 320, easing: SEC_EASE, fill: 'forwards' }
  );
  anim.onfinish = () => node.remove();
  anim.oncancel = () => node.remove();
}

/**
 * Soft update of a mini-profile card: patch the open card instead of replacing it.
 * The card is a root element holding decorations (shine / foil) plus `[data-sec]` blocks, each
 * with a single root element. Changed blocks fade in (and grow / shrink to their new height),
 * new blocks expand into place, removed blocks collapse, and the card's class list is swapped in
 * place so tier colors transition (see @property in the card CSS).
 * `cardSelector` matches the card root inside `el`. Returns false when the card has no sections
 * to patch (e.g. the error card) and the markup was simply replaced.
 */
export function morphCard(el, html, cardSelector) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  const next = tpl.content.firstElementChild;
  const cur = el.querySelector(`:scope > ${cardSelector}`);
  if (!next || !cur || !cur.querySelector(':scope > [data-sec]')) {
    el.innerHTML = html;
    return false;
  }

  cur.className = next.className;

  const oldSecs = new Map();
  cur
    .querySelectorAll(`:scope > [data-sec]:not(.${LEAVING_SEC})`)
    .forEach((n) => oldSecs.set(n.dataset.sec, n));
  const nextSecs = [...next.querySelectorAll(':scope > [data-sec]')];
  const nextIds = new Set(nextSecs.map((n) => n.dataset.sec));
  oldSecs.forEach((n, id) => {
    if (!nextIds.has(id)) leaveSection(n);
  });

  const nodes = [];
  const jobs = [];
  for (const sec of nextSecs) {
    const id = sec.dataset.sec;
    const old = oldSecs.get(id);
    if (!old) {
      nodes.push(sec);
      jobs.push({ node: sec, fresh: true });
      continue;
    }
    if (old.innerHTML === sec.innerHTML) {
      nodes.push(old);
      continue;
    }
    const reused = new Set();
    const oldInner = old.firstElementChild;
    const newInner = sec.firstElementChild;
    if (oldInner && newInner) reuseNodes(oldInner, newInner, reused);
    const h0 = old.offsetHeight;
    old.replaceWith(sec);
    nodes.push(sec);
    jobs.push({ node: sec, h0, reused });
  }

  const nextLive = (from) => {
    let n = from ? from.nextElementSibling : cur.firstElementChild;
    while (n?.classList.contains(LEAVING_SEC)) n = n.nextElementSibling;
    return n;
  };
  // Sections go after the card's decorations (shine / foil), which are the non-section children.
  const decor = cur.querySelectorAll(':scope > :not([data-sec])');
  let prev = decor.length ? decor[decor.length - 1] : null;
  for (const node of nodes) {
    const want = nextLive(prev);
    if (node !== want) cur.insertBefore(node, want);
    prev = node;
  }

  if (prefersReducedMotion()) return true;

  for (const job of jobs) {
    const { node } = job;
    const h1 = node.offsetHeight;
    const run = (frames, opts) => {
      node.style.overflow = 'hidden';
      const anim = node.animate(frames, { duration: 420, easing: SEC_EASE, ...opts });
      const done = () => {
        node.style.overflow = '';
      };
      anim.onfinish = done;
      anim.oncancel = done;
    };
    if (job.fresh) {
      run(
        [
          { height: '0px', marginTop: '0px', opacity: 0, transform: 'translateY(8px)' },
          { height: `${h1}px`, marginTop: getComputedStyle(node).marginTop, opacity: 1, transform: 'none' },
        ],
        {}
      );
      continue;
    }
    if (Math.abs(h1 - job.h0) > 1) {
      run([{ height: `${job.h0}px` }, { height: `${h1}px` }], {});
    }
    const inner = node.firstElementChild;
    if (!inner) continue;
    freshTargets(inner, job.reused).forEach((target, i) => {
      target.animate(
        [
          { opacity: 0, transform: 'translateY(5px)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 380, delay: Math.min(i, 6) * 35, easing: SEC_EASE, fill: 'backwards' }
      );
    });
  }
  return true;
}
