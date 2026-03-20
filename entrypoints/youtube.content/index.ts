import './style.css';
import { mountPanel, cleanupPanel } from './panel';

// Resolves once #below-the-fold exists in the DOM.
function waitForAnchor(): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector('#below-the-fold')) { resolve(); return; }
    const observer = new MutationObserver(() => {
      if (document.querySelector('#below-the-fold')) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  });
}

// On SPA navigation, YouTube replaces #below-the-fold.
// We wait for the old one to disappear, then for the new one to appear.
// Fallback: if it never disappears (in-place update), resolve after 800ms.
function waitForAnchorRefresh(): Promise<void> {
  return new Promise((resolve) => {
    let gone = false;
    const timeout = setTimeout(() => { observer.disconnect(); resolve(); }, 800);

    const observer = new MutationObserver(() => {
      const exists = !!document.querySelector('#below-the-fold');
      if (!gone && !exists) {
        gone = true;
      } else if (gone && exists) {
        clearTimeout(timeout);
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  });
}

export default defineContentScript({
  matches: ['*://*.youtube.com/watch*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    await waitForAnchor();

    const ui = await createShadowRootUi(ctx, {
      name: 'riff-mark-panel',
      position: 'inline',
      anchor: '#below-the-fold',
      append: 'before',
      onMount(container) {
        mountPanel(container, ctx);
      },
      onRemove() {
        cleanupPanel();
      },
    });

    ui.mount();

    // Self-healing: if YouTube's DOM mutations remove our panel without us
    // asking (e.g. it replaces the parent container mid-session), re-inject.
    function watchForRemoval() {
      const host = document.querySelector('riff-mark-panel');
      const parent = host?.parentElement;
      if (!parent) return;

      const observer = new MutationObserver(async () => {
        if (parent.contains(document.querySelector('riff-mark-panel'))) return;
        observer.disconnect();
        if (!window.location.pathname.startsWith('/watch')) return;
        await waitForAnchor();
        ui.mount();
        watchForRemoval();
      });

      observer.observe(parent, { childList: true });
      ctx.onInvalidated(() => observer.disconnect());
    }
    watchForRemoval();

    // SPA navigation: wait for YouTube to swap in a fresh #below-the-fold
    // before re-mounting so we attach to the new DOM, not the stale one.
    ctx.addEventListener(window, 'yt-navigate-finish', async () => {
      ui.remove();
      await waitForAnchorRefresh();
      ui.mount();
      watchForRemoval();
    });
  },
});
