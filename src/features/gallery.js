import { STEAMDB_ATTR } from '../constants.js';
import { fmt } from '../i18n/index.js';
import { settings, t } from '../state.js';
import { escapeAttr, escapeHtml } from '../utils/html.js';
import { getGameTitle } from './page.js';

export let steamGalleryItems = [];

export function setSteamGalleryItems(items) {
  steamGalleryItems = items;
}

export function buildSteamGalleryItems(screenshots, coverUrl) {
  const items = [];
  const cover = String(coverUrl || '').trim();
  if (cover) {
    items.push({ thumb: cover, full: cover, kind: 'cover' });
  }
  if (Array.isArray(screenshots)) {
    for (const shot of screenshots) {
      const thumb = String(shot?.thumb || '').trim();
      const full = String(shot?.full || thumb).trim();
      if (!thumb && !full) continue;
      items.push({
        id: shot?.id,
        thumb: thumb || full,
        full: full || thumb,
        kind: 'screenshot',
      });
    }
  }
  return items;
}

export function bindSteamDbCoverGallery(items) {
  const box = document.querySelector(`[${STEAMDB_ATTR}="cover"]`);
  if (!box) return;
  const coverIdx = Array.isArray(items) ? items.findIndex((s) => s.kind === 'cover') : -1;
  if (!settings.showSteamDbCover || coverIdx < 0 || !items.length) {
    box.classList.remove('is-gallery');
    box.removeAttribute('role');
    box.removeAttribute('tabindex');
    box.removeAttribute('aria-label');
    box.onclick = null;
    box.onkeydown = null;
    return;
  }
  box.classList.add('is-gallery');
  box.setAttribute('role', 'button');
  box.setAttribute('tabindex', '0');
  box.setAttribute('aria-label', t.steamGalleryOpen);
  const open = () => openSteamGalleryLightbox(items, coverIdx);
  box.onclick = (ev) => {
    ev.preventDefault();
    open();
  };
  box.onkeydown = (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      open();
    }
  };
}

const GAME_COVER_VIEWER_ATTR = 'data-blp-cover-viewer';

export function gameCoverImageEl() {
  return (
    document.querySelector(
      '#interaction-sidebar > div > div.col.col-cover.px-sm-0.my-auto.mx-auto.mb-0.mb-2.mb-mb-0 > div > div > img'
    ) ||
    document.querySelector('#interaction-sidebar .col-cover .game-cover img') ||
    document.querySelector('#interaction-sidebar .col-cover img')
  );
}

export function gameCoverViewerSrc(img) {
  if (!img) return '';
  const dataSrc = String(img.getAttribute('data-src') || '').trim();
  const src = String(img.currentSrc || img.getAttribute('src') || '').trim();
  // Prefer lazy hi-res (often t_cover_big_2x) when present.
  return dataSrc || src;
}

export function onGameCoverViewerClick(ev) {
  ev.preventDefault();
  ev.stopPropagation();
  const img = ev.currentTarget;
  if (!(img instanceof HTMLImageElement)) return;
  openGameCoverViewer(img);
}

export function onGameCoverViewerKeydown(ev) {
  if (ev.key !== 'Enter' && ev.key !== ' ') return;
  ev.preventDefault();
  ev.stopPropagation();
  onGameCoverViewerClick(ev);
}

export function unbindGameCoverViewer() {
  document.querySelectorAll(`img[${GAME_COVER_VIEWER_ATTR}]`).forEach((img) => {
    img.removeEventListener('click', onGameCoverViewerClick);
    img.removeEventListener('keydown', onGameCoverViewerKeydown);
    img.removeAttribute(GAME_COVER_VIEWER_ATTR);
    img.classList.remove('blp-cover-zoomable');
    img.removeAttribute('role');
    img.removeAttribute('tabindex');
    img.removeAttribute('aria-label');
  });
}

export function openGameCoverViewer(img) {
  const full = gameCoverViewerSrc(img);
  const thumb = String(img.currentSrc || img.getAttribute('src') || full).trim();
  if (!full && !thumb) return;
  const coverItem = {
    src: full || thumb,
    thumb: thumb || full,
    kind: 'cover',
    alt: img.getAttribute('alt') || '',
  };
  const seen = new Set([coverItem.src, coverItem.thumb].filter(Boolean));
  const extras = [];
  for (const shot of steamGalleryItems || []) {
    const src = String(shot.full || shot.src || shot.thumb || '').trim();
    const tmb = String(shot.thumb || shot.full || shot.src || '').trim();
    if (!src || seen.has(src)) continue;
    seen.add(src);
    extras.push({
      src,
      thumb: tmb || src,
      kind: shot.kind || 'screenshot',
      alt: shot.alt || '',
    });
  }
  openBlpImageViewer({
    items: [coverItem, ...extras],
    index: 0,
    title: getGameTitle() || t.viewerOpenCover,
  });
}

export function bindGameCoverViewer() {
  const img = gameCoverImageEl();
  if (!img) return;
  if (img.getAttribute(GAME_COVER_VIEWER_ATTR) === '1') return;
  img.setAttribute(GAME_COVER_VIEWER_ATTR, '1');
  img.classList.add('blp-cover-zoomable');
  img.setAttribute('role', 'button');
  img.setAttribute('tabindex', '0');
  img.setAttribute('aria-label', t.viewerOpenCover);
  img.addEventListener('click', onGameCoverViewerClick);
  img.addEventListener('keydown', onGameCoverViewerKeydown);
}

/**
 * Reusable fullscreen image viewer (zoom / pan / filmstrip).
 * openBlpImageViewer({ items, index, title })
 * closeBlpImageViewer()
 * isBlpImageViewerOpen()
 *
 * Item: { src|full, thumb?, alt?, kind? }
 */
const BlpImageViewer = (() => {
  const MIN_SCALE = 1;
  const MAX_SCALE = 5;
  const ZOOM_STEP = 1.25;

  let session = null;

  function normalizeItems(raw) {
    const out = [];
    for (const item of raw || []) {
      if (!item) continue;
      if (typeof item === 'string') {
        const src = item.trim();
        if (src) out.push({ src, thumb: src, alt: '', kind: '' });
        continue;
      }
      const src = String(item.src || item.full || item.url || '').trim();
      const thumb = String(item.thumb || item.thumbnail || src).trim();
      if (!src && !thumb) continue;
      out.push({
        src: src || thumb,
        thumb: thumb || src,
        alt: String(item.alt || ''),
        kind: String(item.kind || ''),
      });
    }
    return out;
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function isOpen() {
    return Boolean(session?.root?.isConnected);
  }

  function close() {
    if (!session) return;
    const { root, onKeyDown, onClose, prevOverflow } = session;
    document.removeEventListener('keydown', onKeyDown, true);
    root?.remove();
    if (prevOverflow != null) document.documentElement.style.overflow = prevOverflow;
    session = null;
    if (typeof onClose === 'function') {
      try {
        onClose();
      } catch (_) {
        /* ignore */
      }
    }
  }

  function applyTransform() {
    if (!session) return;
    const { frame, scale, tx, ty } = session;
    frame.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    if (session.zoomOutBtn) session.zoomOutBtn.disabled = scale <= MIN_SCALE + 0.001;
    if (session.zoomInBtn) session.zoomInBtn.disabled = scale >= MAX_SCALE - 0.001;
    if (session.resetBtn) session.resetBtn.disabled = scale <= MIN_SCALE + 0.001 && Math.abs(tx) < 1 && Math.abs(ty) < 1;
  }

  function resetTransform() {
    if (!session) return;
    session.scale = MIN_SCALE;
    session.tx = 0;
    session.ty = 0;
    applyTransform();
  }

  function zoomAt(nextScale, clientX, clientY) {
    if (!session) return;
    const stage = session.stage;
    const rect = stage.getBoundingClientRect();
    const cx = clientX == null ? rect.left + rect.width / 2 : clientX;
    const cy = clientY == null ? rect.top + rect.height / 2 : clientY;
    const px = cx - rect.left - rect.width / 2;
    const py = cy - rect.top - rect.height / 2;
    const prev = session.scale;
    const scale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    if (scale === prev) {
      applyTransform();
      return;
    }
    // Keep the point under the cursor stable while scaling.
    session.tx = px - ((px - session.tx) * scale) / prev;
    session.ty = py - ((py - session.ty) * scale) / prev;
    session.scale = scale;
    if (scale <= MIN_SCALE + 0.001) {
      session.tx = 0;
      session.ty = 0;
      session.scale = MIN_SCALE;
    }
    applyTransform();
  }

  function zoomBy(factor, clientX, clientY) {
    if (!session) return;
    zoomAt(session.scale * factor, clientX, clientY);
  }

  function updateFilmHighlight() {
    if (!session) return;
    const { film, index, items } = session;
    film.querySelectorAll('[data-blp-viewer-thumb]').forEach((btn) => {
      const i = Number(btn.getAttribute('data-blp-viewer-thumb'));
      btn.classList.toggle('is-active', i === index);
      btn.classList.toggle('is-near', Math.abs(i - index) === 1);
      btn.setAttribute('aria-current', i === index ? 'true' : 'false');
    });
    const active = film.querySelector(`[data-blp-viewer-thumb="${index}"]`);
    active?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    if (session.counter) {
      session.counter.textContent = fmt(t.viewerOf, {
        current: index + 1,
        total: items.length,
      });
    }
    const multi = items.length > 1;
    if (session.prevBtn) session.prevBtn.hidden = !multi;
    if (session.nextBtn) session.nextBtn.hidden = !multi;
  }

  function setStageLoading(on) {
    if (!session) return;
    session.stage?.classList.toggle('is-loading', Boolean(on));
    session.root?.setAttribute('aria-busy', on ? 'true' : 'false');
    if (session.spinner) {
      session.spinner.setAttribute('aria-hidden', on ? 'false' : 'true');
    }
  }

  function prefetchAround(index) {
    if (!session) return;
    const { items } = session;
    if (items.length < 2) return;
    for (const offset of [-1, 1, 2]) {
      const item = items[((index + offset) % items.length + items.length) % items.length];
      const src = item?.src;
      if (!src || session.prefetched.has(src)) continue;
      session.prefetched.add(src);
      const probe = new Image();
      probe.decoding = 'async';
      probe.referrerPolicy = 'no-referrer';
      probe.src = src;
    }
  }

  function show(index, { keepZoom = false } = {}) {
    if (!session) return;
    const { items, img } = session;
    const next = ((index % items.length) + items.length) % items.length;
    session.index = next;
    const item = items[next];
    if (!item || !img) return;

    const gen = ++session.loadGen;
    img.alt = item.alt || '';
    if (!keepZoom) resetTransform();
    updateFilmHighlight();
    prefetchAround(next);

    const src = item.src;
    const already =
      (img.getAttribute('src') || '') === src && img.complete && img.naturalWidth > 0;
    if (already) {
      setStageLoading(false);
      return;
    }

    setStageLoading(true);
    const finish = () => {
      if (!session || session.loadGen !== gen) return;
      setStageLoading(false);
    };
    img.addEventListener('load', finish, { once: true });
    img.addEventListener('error', finish, { once: true });
    img.src = src;
    if (img.complete && img.naturalWidth > 0) finish();
  }

  function go(delta) {
    if (!session) return;
    show(session.index + delta);
  }

  function bindStageInteractions() {
    const { stage, root } = session;
    let dragging = false;
    let moved = false;
    let lastX = 0;
    let lastY = 0;
    let pointers = new Map();
    let pinchStartDist = 0;
    let pinchStartScale = 1;

    const pointHitsImage = (clientX, clientY) => {
      const img = session.img;
      if (!img) return false;
      const r = img.getBoundingClientRect();
      return (
        clientX >= r.left &&
        clientX <= r.right &&
        clientY >= r.top &&
        clientY <= r.bottom
      );
    };

    const onWheel = (ev) => {
      ev.preventDefault();
      const factor = ev.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      zoomBy(factor, ev.clientX, ev.clientY);
    };

    const onPointerDown = (ev) => {
      if (ev.button != null && ev.button !== 0) return;
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pointers.size === 2) {
        const pts = [...pointers.values()];
        pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
        pinchStartScale = session.scale;
        dragging = false;
        stage.setPointerCapture?.(ev.pointerId);
        return;
      }
      // Pan at any zoom, but only when grabbing the image (not empty backdrop).
      if (!pointHitsImage(ev.clientX, ev.clientY)) return;
      stage.setPointerCapture?.(ev.pointerId);
      dragging = true;
      moved = false;
      lastX = ev.clientX;
      lastY = ev.clientY;
      stage.classList.add('is-dragging');
    };

    const onPointerMove = (ev) => {
      if (pointers.has(ev.pointerId)) {
        pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      }
      if (pointers.size === 2) {
        const pts = [...pointers.values()];
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
        const midX = (pts[0].x + pts[1].x) / 2;
        const midY = (pts[0].y + pts[1].y) / 2;
        zoomAt(pinchStartScale * (dist / pinchStartDist), midX, midY);
        return;
      }
      if (!dragging) return;
      const dx = ev.clientX - lastX;
      const dy = ev.clientY - lastY;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) moved = true;
      lastX = ev.clientX;
      lastY = ev.clientY;
      session.tx += dx;
      session.ty += dy;
      applyTransform();
    };

    const endPointer = (ev) => {
      pointers.delete(ev.pointerId);
      if (pointers.size < 2) {
        pinchStartDist = 0;
      }
      if (!dragging) return;
      dragging = false;
      stage.classList.remove('is-dragging');
      stage.releasePointerCapture?.(ev.pointerId);
    };

    const onDblClick = (ev) => {
      ev.preventDefault();
      if (session.scale > MIN_SCALE + 0.01 || Math.abs(session.tx) > 1 || Math.abs(session.ty) > 1) {
        resetTransform();
      } else {
        zoomAt(2.5, ev.clientX, ev.clientY);
      }
    };

    stage.addEventListener('wheel', onWheel, { passive: false });
    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', endPointer);
    stage.addEventListener('pointercancel', endPointer);
    stage.addEventListener('dblclick', onDblClick);

    // Close when clicking backdrop / empty stage around the image (not the image itself).
    root.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-blp-viewer-close]')) {
        close();
        return;
      }
      if (
        ev.target.closest(
          '.blp-viewer__tool, .blp-viewer__nav, .blp-viewer__film, .blp-viewer__chrome, .blp-viewer__counter, .blp-viewer__title'
        )
      ) {
        return;
      }
      if (moved) {
        moved = false;
        return;
      }
      if (pointHitsImage(ev.clientX, ev.clientY)) return;
      close();
    });
  }

  function open(options = {}) {
    const items = normalizeItems(options.items);
    if (!items.length) return null;
    close();

    let index = Number(options.index);
    if (!Number.isFinite(index)) index = 0;
    index = clamp(index | 0, 0, items.length - 1);

    const title = options.title || t.steamGalleryTitle || '';
    const root = document.createElement('div');
    root.className = 'blp-viewer';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', title || 'Image viewer');
    root.innerHTML = `
      <div class="blp-viewer__chrome">
        <div class="blp-viewer__chrome-left">
          <span class="blp-viewer__title">${escapeHtml(title)}</span>
          <span class="blp-viewer__counter" data-blp-viewer-counter></span>
        </div>
        <div class="blp-viewer__chrome-right">
          <button type="button" class="blp-viewer__tool" data-blp-viewer-zoom-out aria-label="${escapeAttr(t.viewerZoomOut)}">−</button>
          <button type="button" class="blp-viewer__tool" data-blp-viewer-zoom-reset aria-label="${escapeAttr(t.viewerZoomReset)}">⟲</button>
          <button type="button" class="blp-viewer__tool" data-blp-viewer-zoom-in aria-label="${escapeAttr(t.viewerZoomIn)}">+</button>
          <button type="button" class="blp-viewer__tool" data-blp-viewer-close aria-label="${escapeAttr(t.steamGalleryClose)}">×</button>
        </div>
      </div>
      <div class="blp-viewer__body">
        <button type="button" class="blp-viewer__nav" data-blp-viewer-prev aria-label="${escapeAttr(t.steamGalleryPrev)}">‹</button>
        <div class="blp-viewer__stage" data-blp-viewer-stage>
          <div class="blp-viewer__spinner" data-blp-viewer-spinner aria-hidden="true" aria-label="${escapeAttr(t.loading)}"></div>
          <div class="blp-viewer__frame" data-blp-viewer-frame>
            <img class="blp-viewer__img" alt="" decoding="async" referrerpolicy="no-referrer" draggable="false" />
          </div>
        </div>
        <button type="button" class="blp-viewer__nav" data-blp-viewer-next aria-label="${escapeAttr(t.steamGalleryNext)}">›</button>
      </div>
      <div class="blp-viewer__film" data-blp-viewer-film></div>
    `;

    const film = root.querySelector('[data-blp-viewer-film]');
    film.innerHTML = items
      .map((item, i) => {
        const coverClass = item.kind === 'cover' ? ' blp-viewer__thumb--cover' : '';
        return `
          <button type="button" class="blp-viewer__thumb${coverClass}" data-blp-viewer-thumb="${i}" aria-label="${escapeAttr(t.steamGalleryOpen)}">
            <img src="${escapeAttr(item.thumb || item.src)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" draggable="false" />
          </button>
        `;
      })
      .join('');

    const onKeyDown = (ev) => {
      if (!session) return;
      if (ev.key === 'Escape') {
        ev.preventDefault();
        close();
        return;
      }
      if (ev.key === 'ArrowLeft') {
        ev.preventDefault();
        go(-1);
        return;
      }
      if (ev.key === 'ArrowRight') {
        ev.preventDefault();
        go(1);
        return;
      }
      if (ev.key === 'Home') {
        ev.preventDefault();
        show(0);
        return;
      }
      if (ev.key === 'End') {
        ev.preventDefault();
        show(items.length - 1);
        return;
      }
      if (ev.key === '+' || ev.key === '=') {
        ev.preventDefault();
        zoomBy(ZOOM_STEP);
        return;
      }
      if (ev.key === '-' || ev.key === '_') {
        ev.preventDefault();
        zoomBy(1 / ZOOM_STEP);
        return;
      }
      if (ev.key === '0') {
        ev.preventDefault();
        resetTransform();
      }
    };

    session = {
      root,
      items,
      index,
      scale: MIN_SCALE,
      tx: 0,
      ty: 0,
      loadGen: 0,
      prefetched: new Set(),
      prevOverflow: document.documentElement.style.overflow,
      img: root.querySelector('.blp-viewer__img'),
      frame: root.querySelector('[data-blp-viewer-frame]'),
      stage: root.querySelector('[data-blp-viewer-stage]'),
      spinner: root.querySelector('[data-blp-viewer-spinner]'),
      film,
      counter: root.querySelector('[data-blp-viewer-counter]'),
      prevBtn: root.querySelector('[data-blp-viewer-prev]'),
      nextBtn: root.querySelector('[data-blp-viewer-next]'),
      zoomInBtn: root.querySelector('[data-blp-viewer-zoom-in]'),
      zoomOutBtn: root.querySelector('[data-blp-viewer-zoom-out]'),
      resetBtn: root.querySelector('[data-blp-viewer-zoom-reset]'),
      onKeyDown,
      onClose: options.onClose,
    };

    document.documentElement.style.overflow = 'hidden';

    session.prevBtn?.addEventListener('click', (ev) => {
      ev.stopPropagation();
      go(-1);
    });
    session.nextBtn?.addEventListener('click', (ev) => {
      ev.stopPropagation();
      go(1);
    });
    session.zoomInBtn?.addEventListener('click', (ev) => {
      ev.stopPropagation();
      zoomBy(ZOOM_STEP);
    });
    session.zoomOutBtn?.addEventListener('click', (ev) => {
      ev.stopPropagation();
      zoomBy(1 / ZOOM_STEP);
    });
    session.resetBtn?.addEventListener('click', (ev) => {
      ev.stopPropagation();
      resetTransform();
    });
    film.querySelectorAll('[data-blp-viewer-thumb]').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        show(Number(btn.getAttribute('data-blp-viewer-thumb')));
      });
    });

    bindStageInteractions();
    document.body.appendChild(root);
    document.addEventListener('keydown', onKeyDown, true);
    show(index);
    return session;
  }

  return {
    open,
    close,
    isOpen,
    go,
    show,
    zoomBy,
    resetTransform,
  };
})();

export function openBlpImageViewer(options) {
  return BlpImageViewer.open(options);
}

export function closeBlpImageViewer() {
  BlpImageViewer.close();
}

export function isBlpImageViewerOpen() {
  return BlpImageViewer.isOpen();
}

export function closeSteamGalleryLightbox() {
  closeBlpImageViewer();
}

export function openSteamGalleryLightbox(shots, startIndex) {
  openBlpImageViewer({
    items: shots,
    index: startIndex,
    title: t.steamGalleryTitle,
  });
}
